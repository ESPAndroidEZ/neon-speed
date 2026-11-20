/* Lobby (src/net/lobby.ts) over the REAL lobby server (server/lobby/lobby.py on a free local port): three players,
 * the host starts a race and then drops; the first guest takes over, the other guest's car states still reach it,
 * and nobody's race is ended. Skips (PASS with a note) without python3. */
import { spawn, spawnSync } from 'node:child_process';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (f: () => boolean, ms = 3000): Promise<boolean> => { for (let t = 0; t < ms && !f(); t += 20) await wait(20); return f(); };

if (spawnSync('python3', ['--version']).error) {
  console.log('PASS  lobby hand-over tests skipped: no python3');
  process.exit(0);
}
const port = 20000 + Math.floor(Math.random() * 20000);
const proc = spawn('python3', ['server/lobby/lobby.py', '--port', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise<void>((res) => proc.stdout.once('data', () => res()));
const g = globalThis as Record<string, unknown>;
g.window = globalThis;
g.location = { protocol: 'http:', host: 'game.test', hostname: 'game.test' };
const mem = new Map<string, string>([['ns-lobby-url', `ws://127.0.0.1:${port}/ws/`]]);
g.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
const { Lobby } = await import('../src/net/lobby.ts');
const me = (name: string) => ({ id: '', name, car: 'civic', paint: 0 });
const st = (id: string, x: number) => ({ id, x, z: 0, h: 0, u: 0, v: 0, r: 0, i: [0, 0, 0, 0, 0] as [number, number, number, number, number], lap: 0, fin: 0 });

try {
  const A = new Lobby(), B = new Lobby(), C = new Lobby();
  const started: string[] = [], atB: number[] = [];
  B.onStart = () => started.push('B'); C.onStart = () => started.push('C');
  B.onState = (s) => atB.push(s.x);
  await A.create(me('Ana'), true);
  check('host creates a room on the own server', A.role === 'host' && A.link.via === 'server', A.code);
  await B.join(A.code, me('Ben'));
  await C.join(A.code, me('Cris'));
  check('two guests join; host lists three players', await until(() => A.players.length === 3) && B.link.via === 'server');
  A.start();
  check('host starts: both guests get the start', await until(() => started.length === 2));
  A.leave(); // the host's tab closes mid-race
  check('first guest becomes host', await until(() => B.role === 'host') && B.hostId === B.me.id, `${B.role}`);
  check('other guest follows the new host, nobody failed', await until(() => C.hostId === B.me.id) && C.error === '' && B.error === '' && C.role === 'guest');
  check('the old host is gone from the player list', await until(() => B.players.length === 2 && !B.players.some((p) => p.name === 'Ana')));
  C.sendState(st(C.me.id, 42));
  check('race goes on: the guest car state reaches the new host', await until(() => atB.includes(42)));
  B.leave(); C.leave();
} finally {
  proc.kill();
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
