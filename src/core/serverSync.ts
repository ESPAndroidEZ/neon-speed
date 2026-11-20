/**
 * Server storage. The game's progress (save, save slots, achievements, stats, ghosts) lives in a MySQL database behind
 * server/api/storage.php; the browser keeps only a cache and the player code (key `rb-player`). Nothing in the game's own
 * code changed: `localStorage` writes of the synced keys are noticed (installSync) and sent to the server a moment later,
 * and `boot.ts` loads the server's copy before the game starts. Offline or without the API (GitHub Pages, phone apps) the
 * game just runs on the cache and uploads what changed once the server answers again.
 */
export const SYNC_KEY = /^(racers-blood-save-v1|racers-blood-slots|ns\.ach|ns\.stats|ns-online-name|rb-ghost:[A-Za-z0-9_-]{1,40}:[A-Za-z0-9_-]{1,40})$/;
export const CODE_RE = /^[A-Z2-7]{20}$/;
const PLAYER_KEY = 'rb-player';
const DIRTY_KEY = 'rb-sync-dirty'; // keys changed here and not yet confirmed by the server (never synced itself)
const TS_KEY = 'rb-sync-ts'; // server time of the last complete pull: the next pull asks only for what changed after it
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BATCH = 40;

export interface SyncStore {
  getItem(k: string): string | null;
  key(i: number): string | null;
  readonly length: number;
}
export interface SyncDeps {
  store: SyncStore;
  /** Writes that do NOT count as a local change (the unpatched Storage methods). */
  rawSet(k: string, v: string): void;
  rawRemove(k: string): void;
  fetch: typeof fetch;
  url: string;
  /** Compress big uploads (browsers with CompressionStream). */
  gzip?: boolean;
  timeoutMs?: number;
  /** Debounce hook (tests run it at once). */
  later?: (fn: () => void, ms: number) => void;
  random?: (n: number) => Uint8Array;
}
export type SyncStatus = 'idle' | 'ok' | 'offline' | 'off';

/** 20 characters of base32 = 100 bits: the player's secret and the key to carry progress to another device. */
export function newPlayerCode(random: (n: number) => Uint8Array): string {
  let out = '';
  for (const b of random(20)) out += ALPHABET[b & 31];
  return out;
}

/** What the player types (dashes, spaces, lower case) -> a code, or null. */
export function normalizeCode(s: string): string | null {
  const c = s.toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(c) ? c : null;
}
export const showCode = (c: string): string => c.replace(/(.{5})(?=.)/g, '$1-');

export class ServerSync {
  status: SyncStatus = 'idle';
  private readonly d: SyncDeps;
  private dirty = new Set<string>();
  private cancelled = false;
  private noApi = false;
  private pending = false;

  constructor(d: SyncDeps) {
    this.d = d;
    try {
      const raw = d.store.getItem(DIRTY_KEY);
      if (raw) for (const k of JSON.parse(raw) as unknown[]) if (typeof k === 'string' && SYNC_KEY.test(k)) this.dirty.add(k);
    } catch {
      /* unreadable list: nothing is pending */
    }
  }

  /** The player's code; made (and kept in the browser) on first use. */
  code(): string {
    const have = this.d.store.getItem(PLAYER_KEY);
    if (have && CODE_RE.test(have)) return have;
    const rnd = this.d.random ?? ((n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n)));
    const c = newPlayerCode(rnd);
    this.d.rawSet(PLAYER_KEY, c);
    return c;
  }

  /** Switch to another player's code: forget the local copy of the synced keys so the server's copy is loaded next start. */
  switchTo(code: string): void {
    for (let i = this.d.store.length - 1; i >= 0; i--) {
      const k = this.d.store.key(i);
      if (k && SYNC_KEY.test(k)) this.d.rawRemove(k);
    }
    this.dirty.clear();
    this.d.rawRemove(DIRTY_KEY);
    this.d.rawRemove(TS_KEY); // the new player gets a full pull
    this.d.rawSet(PLAYER_KEY, code);
  }

  /** Give up on a pull that took too long (the game started on the cache): its late answer must not overwrite anything. */
  cancel(): void {
    this.cancelled = true;
  }

  /** Server copy wins, except for keys changed here while offline (those are uploaded); keys only we have are uploaded. */
  async pull(): Promise<void> {
    const since = Number(this.d.store.getItem(TS_KEY)) || 0;
    const r = await this.request('GET', undefined, since > 0 ? `?since=${since}` : '');
    if (this.cancelled) return;
    if (!r) return;
    const keys = (r as { keys?: Record<string, { v: string }> }).keys ?? {};
    const now = Number((r as { now?: number }).now) || 0;
    for (const [k, e] of Object.entries(keys)) if (SYNC_KEY.test(k) && !this.dirty.has(k) && typeof e.v === 'string') this.d.rawSet(k, e.v);
    const up: Record<string, string | null> = {};
    for (let i = 0; i < this.d.store.length; i++) {
      const k = this.d.store.key(i);
      if (k && SYNC_KEY.test(k) && (this.dirty.has(k) || (since === 0 && !(k in keys)))) up[k] = this.d.store.getItem(k); // an incremental answer lists only changed keys, so "missing" only means something on a full pull
    }
    for (const k of this.dirty) if (this.d.store.getItem(k) === null) up[k] = null; // removed while offline
    await this.send(up);
    this.status = this.pending ? 'offline' : 'ok';
    if (now > 0 && !this.pending) this.d.rawSet(TS_KEY, String(now - 2)); // a little overlap: a row written in the same second is never missed
  }

  /** A synced key was written or removed locally: send it shortly (writes in a burst go out as one request). */
  mark(k: string): void {
    if (this.noApi || !SYNC_KEY.test(k)) return;
    this.dirty.add(k);
    this.saveDirty();
    (this.d.later ?? ((fn, ms) => void setTimeout(fn, ms)))(() => void this.flush(), 1500);
  }

  async flush(): Promise<void> {
    const up: Record<string, string | null> = {};
    for (const k of this.dirty) up[k] = this.d.store.getItem(k);
    await this.send(up);
    this.status = this.noApi ? 'off' : this.pending ? 'offline' : 'ok';
  }

  private async send(items: Record<string, string | null>): Promise<void> {
    const keys = Object.keys(items);
    this.pending = false;
    for (let i = 0; i < keys.length; i += BATCH) {
      const part: Record<string, string | null> = {};
      for (const k of keys.slice(i, i + BATCH)) part[k] = items[k];
      const ok = await this.request('POST', JSON.stringify({ items: part }));
      if (!ok) {
        this.pending = this.pending || !this.noApi;
        continue;
      }
      for (const k of Object.keys(part)) this.dirty.delete(k);
    }
    this.saveDirty();
  }

  private saveDirty(): void {
    if (this.dirty.size) this.d.rawSet(DIRTY_KEY, JSON.stringify([...this.dirty]));
    else this.d.rawRemove(DIRTY_KEY);
  }

  private async request(method: 'GET' | 'POST', body?: string, query = ''): Promise<object | null> {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctl?.abort(), this.d.timeoutMs ?? 6000);
    try {
      const headers: Record<string, string> = { 'X-Player': this.code() };
      let payload: BodyInit | undefined = body;
      if (body && this.d.gzip && body.length > 20000 && typeof CompressionStream !== 'undefined') {
        payload = await new Response(new Blob([body]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
        headers['Content-Encoding'] = 'gzip';
      }
      const res = await this.d.fetch(this.d.url + query, { method, body: payload, cache: 'no-store', signal: ctl?.signal, headers });
      if (res.status === 404 || res.status === 405) {
        this.noApi = true; // no storage API here (static hosting): stay on the cache
        this.status = 'off';
        return null;
      }
      return res.ok ? ((await res.json()) as object) : null;
    } catch {
      return null; // offline, timeout, or the dev server's HTML instead of JSON
    } finally {
      clearTimeout(timer);
    }
  }
}

let current: ServerSync | null = null;
export const getSync = (): ServerSync | null => current;

/** Hook the browser's Storage so a write of a synced key marks it for upload. Returns the sync (also reachable with getSync). */
export function installSync(url: string, local: Storage, proto: { setItem: Storage['setItem']; removeItem: Storage['removeItem'] }, f: typeof fetch): ServerSync {
  const set = proto.setItem, rm = proto.removeItem;
  const sync = new ServerSync({ store: local, rawSet: (k, v) => set.call(local, k, v), rawRemove: (k) => rm.call(local, k), fetch: f, url, gzip: true });
  proto.setItem = function (this: Storage, k: string, v: string): void {
    set.call(this, k, v);
    if (this === local) sync.mark(String(k));
  };
  proto.removeItem = function (this: Storage, k: string): void {
    rm.call(this, k);
    if (this === local) sync.mark(String(k));
  };
  current = sync;
  return sync;
}
