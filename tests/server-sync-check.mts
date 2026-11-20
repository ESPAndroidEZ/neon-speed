import { CODE_RE, normalizeCode, newPlayerCode, ServerSync, showCode, SYNC_KEY } from '../src/core/serverSync.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};

class Mem {
  m = new Map<string, string>();
  getItem = (k: string): string | null => this.m.get(k) ?? null;
  key = (i: number): string | null => [...this.m.keys()][i] ?? null;
  get length(): number { return this.m.size; }
}
/** A fake storage.php: players by code, plus switches for offline and "no API". */
class Server {
  data = new Map<string, Map<string, string>>();
  /** When each key was last written (server seconds); keys set directly in `data` count as old. */
  stamps = new Map<string, number>();
  clock = 1000;
  offline = false;
  status = 200;
  calls = 0;
  posts = 0;
  urls: string[] = [];
  /** Another device writes a key. */
  put(code: string, k: string, v: string): void {
    this.clock += 10;
    const kv = this.data.get(code) ?? new Map<string, string>();
    kv.set(k, v);
    this.data.set(code, kv);
    this.stamps.set(`${code}|${k}`, this.clock);
  }
  fetch = async (u: string, init: { method: string; body?: string; headers: Record<string, string> }): Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }> => {
    this.calls++;
    this.urls.push(u);
    if (this.offline) throw new Error('offline');
    if (this.status !== 200) return { status: this.status, ok: false, json: async () => ({}) };
    const code = init.headers['X-Player'];
    const kv = this.data.get(code) ?? new Map<string, string>();
    if (init.method === 'GET') {
      const since = Number(new URL(u, 'http://h/').searchParams.get('since') ?? 0);
      const keys = Object.fromEntries([...kv].filter(([k]) => since === 0 || (this.stamps.get(`${code}|${k}`) ?? 1) > since).map(([k, v]) => [k, { v, t: 1 }]));
      return { status: 200, ok: true, json: async () => ({ keys, now: this.clock }) };
    }
    this.posts++;
    this.clock += 10;
    const items = (JSON.parse(init.body ?? '{}') as { items: Record<string, string | null> }).items;
    if (Object.keys(items).length > 40) return { status: 400, ok: false, json: async () => ({}) };
    for (const [k, v] of Object.entries(items)) { if (!SYNC_KEY.test(k)) return { status: 400, ok: false, json: async () => ({}) }; if (v === null) kv.delete(k); else { kv.set(k, v); this.stamps.set(`${code}|${k}`, this.clock); } }
    this.data.set(code, kv);
    return { status: 200, ok: true, json: async () => ({ ok: true }) };
  };
}
const rnd = (n: number): Uint8Array => { const a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = (i * 37 + 11) & 255; return a; };
function make(store: Mem, srv: Server): { sync: ServerSync; local: (k: string, v: string) => void } {
  const sync = new ServerSync({ store, rawSet: (k, v) => void store.m.set(k, v), rawRemove: (k) => void store.m.delete(k), fetch: srv.fetch as never, url: 'x', later: (fn) => fn(), random: rnd });
  // what the patched Storage does: write, then mark
  return { sync, local: (k, v) => { store.m.set(k, v); sync.mark(k); } };
}
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 5));

check('player codes are 20 base32 characters', CODE_RE.test(newPlayerCode(rnd)) && newPlayerCode(rnd).length === 20);
check('typed codes: dashes, spaces and lower case are accepted', normalizeCode(' abcde-fghij-klmno pqrst ') === 'ABCDEFGHIJKLMNOPQRST' && normalizeCode('too short') === null && normalizeCode('ABCDEFGHIJKLMNOPQRS1') === null && showCode('ABCDEFGHIJKLMNOPQRST') === 'ABCDE-FGHIJ-KLMNO-PQRST');
check('only game progress keys are synced', SYNC_KEY.test('racers-blood-save-v1') && SYNC_KEY.test('rb-ghost:kestrel:civic') && !SYNC_KEY.test('rb-controls') && !SYNC_KEY.test('rb-player') && !SYNC_KEY.test('rb-tier-detected') && !SYNC_KEY.test('rb-sync-dirty'));

// 1. a device with progress meets an empty server: the progress is uploaded
{
  const store = new Mem(), srv = new Server();
  store.m.set('racers-blood-save-v1', '{"cash":500}');
  store.m.set('rb-controls', 'device only');
  const { sync } = make(store, srv);
  const code = sync.code();
  await sync.pull();
  const up = srv.data.get(code);
  check('existing local progress is uploaded on the first pull (device settings are not)', up?.get('racers-blood-save-v1') === '{"cash":500}' && !up?.has('rb-controls') && sync.status === 'ok');
  check('the code is kept in the browser and stays the same', sync.code() === code && store.m.get('rb-player') === code);
}

// 2. the server's copy comes down and is not sent back
{
  const store = new Mem(), srv = new Server();
  const a = make(store, srv);
  srv.data.set(a.sync.code(), new Map([['racers-blood-save-v1', '{"cash":9000}'], ['ns.ach', '[1]']]));
  await a.sync.pull();
  const calls = srv.calls;
  check('server progress replaces the local cache', store.m.get('racers-blood-save-v1') === '{"cash":9000}' && store.m.get('ns.ach') === '[1]');
  await tick();
  check('values loaded from the server are not uploaded again', srv.calls === calls && !store.m.has('rb-sync-dirty'), `${srv.calls - calls} extra calls`);
}

// 3. a local change reaches the server
{
  const store = new Mem(), srv = new Server();
  const { sync, local } = make(store, srv);
  await sync.pull();
  local('racers-blood-save-v1', '{"cash":42}');
  await tick();
  check('a changed save is stored on the server and nothing stays pending', srv.data.get(sync.code())?.get('racers-blood-save-v1') === '{"cash":42}' && !store.m.has('rb-sync-dirty'));
  local('rb-controls', 'x');
  local('rb-player', 'y');
  check('device-only keys never mark anything', !store.m.has('rb-sync-dirty'));
}

// 4. offline play, then back online: local changes beat the older server copy
{
  const store = new Mem(), srv = new Server();
  const a = make(store, srv);
  await a.sync.pull();
  a.local('racers-blood-save-v1', '{"cash":100}');
  await tick();
  srv.offline = true;
  a.local('racers-blood-save-v1', '{"cash":777}');
  await tick();
  check('offline: the change stays pending and survives a restart', store.m.has('rb-sync-dirty') && a.sync.status === 'offline');
  srv.offline = false;
  const b = make(store, srv); // new session on the same device
  await b.sync.pull();
  check('next start: the offline progress is uploaded, not overwritten by the old server copy', store.m.get('racers-blood-save-v1') === '{"cash":777}' && srv.data.get(a.sync.code())?.get('racers-blood-save-v1') === '{"cash":777}' && !store.m.has('rb-sync-dirty'));
}

// 5. removing a key, and a late pull after cancel
{
  const store = new Mem(), srv = new Server();
  const a = make(store, srv);
  await a.sync.pull();
  a.local('ns.ach', '[2]');
  await tick();
  store.m.delete('ns.ach');
  a.sync.mark('ns.ach');
  await tick();
  check('a removed key is removed on the server', !srv.data.get(a.sync.code())?.has('ns.ach'));
  srv.data.set(a.sync.code(), new Map([['racers-blood-save-v1', '{"cash":1}']]));
  a.sync.cancel();
  await a.sync.pull();
  check('a pull that was cancelled (slow start) changes nothing', store.m.get('racers-blood-save-v1') !== '{"cash":1}');
}

// 6. another player code sees only its own data; switching clears the local copy
{
  const store = new Mem(), srv = new Server();
  const a = make(store, srv);
  await a.sync.pull();
  a.local('racers-blood-save-v1', '{"cash":5}');
  await tick();
  srv.data.set('ABCDEFGHIJKLMNOPQRST', new Map([['racers-blood-save-v1', '{"cash":99999}']]));
  store.m.set('rb-controls', 'keep');
  a.sync.switchTo('ABCDEFGHIJKLMNOPQRST');
  check('switching code forgets the synced local keys but keeps device settings', !store.m.has('racers-blood-save-v1') && store.m.get('rb-controls') === 'keep' && store.m.get('rb-player') === 'ABCDEFGHIJKLMNOPQRST');
  const b = make(store, srv);
  await b.sync.pull();
  check('after the switch the other player\'s progress is loaded', store.m.get('racers-blood-save-v1') === '{"cash":99999}');
}

// 7. no API (static hosting): one try, then silence; the game keeps working
{
  const store = new Mem(), srv = new Server();
  srv.status = 404;
  const { sync, local } = make(store, srv);
  await sync.pull();
  local('racers-blood-save-v1', '{"cash":1}');
  local('racers-blood-save-v1', '{"cash":2}');
  await tick();
  check('a missing API is tried once and then left alone', srv.calls === 1 && sync.status === 'off', `${srv.calls} calls`);
}

// 8. many keys go out in batches of at most 40
{
  const store = new Mem(), srv = new Server();
  for (let i = 0; i < 95; i++) store.m.set(`rb-ghost:t${i}:civic`, String(i));
  const { sync } = make(store, srv);
  await sync.pull();
  check('95 ghosts are uploaded in batches the server accepts', srv.data.get(sync.code())?.size === 95, `${srv.data.get(sync.code())?.size}`);
}

// 9. incremental pulls: after the first full pull a launch asks only for what changed
{
  const store = new Mem(), srv = new Server();
  const a = make(store, srv);
  const code = a.sync.code();
  for (const [k, v] of [['racers-blood-save-v1', '{"cash":1}'], ['racers-blood-slots', 'SLOTS'], ['rb-ghost:kestrel:civic', 'GHOST']]) srv.put(code, k, v);
  await a.sync.pull();
  check('the first pull is full (no since) and stores the server time', !srv.urls[0].includes('since') && store.m.has('rb-sync-ts') && store.m.get('racers-blood-slots') === 'SLOTS', srv.urls[0]);
  store.m.set('racers-blood-slots', 'LOCAL-EDIT-NOT-DIRTY'); // proves an unchanged key is not downloaded again
  srv.clock += 100;
  const posts = srv.posts;
  const b = make(store, srv);
  await b.sync.pull();
  check('the next launch asks with since and nothing newer arrives', /since=\d+/.test(srv.urls.at(-1) ?? '') && store.m.get('racers-blood-slots') === 'LOCAL-EDIT-NOT-DIRTY', srv.urls.at(-1));
  check('an incremental pull uploads nothing (a key missing from the answer is not "missing")', srv.posts === posts && !srv.data.get(code)?.has('LOCAL'), `${srv.posts - posts} posts`);
  srv.put(code, 'ns.ach', '[7]'); // another device
  const c = make(store, srv);
  await c.sync.pull();
  check('a key another device changed arrives, the unchanged ones stay', store.m.get('ns.ach') === '[7]' && store.m.get('rb-ghost:kestrel:civic') === 'GHOST');
  c.sync.switchTo('ABCDEFGHIJKLMNOPQRST');
  check('switching player drops the sync time so the next pull is full', !store.m.has('rb-sync-ts'));
  await make(store, srv).sync.pull();
  check('and that pull asks without since', !(srv.urls.at(-1) ?? '').includes('since'), srv.urls.at(-1));
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
