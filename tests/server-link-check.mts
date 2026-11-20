/* Client transport (src/net/serverLink.ts, hybridLink.ts) against the REAL lobby server (server/lobby/lobby.py,
 * started on a free local port) with Node's built-in WebSocket: host, join, relay, room list, finish stamps, host leaving,
 * PeerJS fallback when the server is down, and the lobby address rules. Skips (PASS with a note) without python3. */
import { spawn, spawnSync } from 'node:child_process';
import { ServerLink, type NetLink, type WsLike } from '../src/net/serverLink.ts';
import { HybridLink, lobbyUrl } from '../src/net/hybridLink.ts';
import type { NetMsg } from '../src/net/protocol.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (f: () => boolean, ms = 2000): Promise<boolean> => { for (let t = 0; t < ms && !f(); t += 20) await wait(20); return f(); };

if (spawnSync('python3', ['--version']).error) {
  console.log('PASS  server link tests skipped: no python3');
  process.exit(0);
}
const port = 20000 + Math.floor(Math.random() * 20000);
const proc = spawn('python3', ['server/lobby/lobby.py', '--port', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise<void>((res) => proc.stdout.once('data', () => res()));
const url = `ws://127.0.0.1:${port}/ws/`;
const ws = (u: string) => new WebSocket(u) as unknown as WsLike;

try {
  const a = new ServerLink(url, ws), b = new ServerLink(url, ws), c = new ServerLink(url, ws);
  const atA: [string, NetMsg][] = [], atB: [string, NetMsg][] = [], joinsA: string[] = [], leftB: string[] = [], fins: number[] = [];
  a.onMsg = (f, m) => atA.push([f, m]); b.onMsg = (f, m) => atB.push([f, m]);
  a.onJoin = (id) => joinsA.push(id); b.onLeave = (id) => leftB.push(id); b.onFin = (_id, at) => fins.push(at);
  await a.host('QWRT', true);
  check('host a room on the lobby server', a.myId.length === 8);
  const taken = await c.host('QWRT').then(() => '', (e) => (e as { type: string }).type);
  check('taken code rejects like PeerJS (unavailable-id)', taken === 'unavailable-id');
  c.close();
  const nope = await c.join('ZZZZ').then(() => '', (e) => (e as { type: string }).type);
  check('unknown code rejects like PeerJS (peer-unavailable)', nope === 'peer-unavailable');
  await b.join('QWRT');
  check('guest joins; host sees it', await until(() => joinsA.includes(b.myId)));
  b.broadcast({ k: 'hello', p: { id: b.myId, name: 'B', car: 'civic', paint: 0 } });
  check('guest message reaches the host with the sender id', await until(() => atA.length === 1) && atA[0][0] === b.myId && atA[0][1].k === 'hello');
  a.broadcast({ k: 'lobby', players: [], host: a.myId, settings: { track: 'neon', weather: 'SNOW' }, racing: false });
  check('host message reaches the guest', await until(() => atB.some(([, m]) => m.k === 'lobby')));
  const twin = new ServerLink(url, ws);
  const [l1, l2] = await Promise.all([twin.rooms(), twin.rooms()]);
  check('two listings at once on a fresh link both reach the server', l1.length === 1 && l2.length === 1 && twin.listed);
  twin.close();
  const list = await c.rooms();
  check('public room list shows the host settings', list.length === 1 && list[0].code === 'QWRT' && list[0].track === 'neon' && list[0].weather === 'SNOW' && list[0].n === 2, JSON.stringify(list));
  a.broadcast({ k: 'go' });
  await wait(60);
  b.broadcast({ k: 'st', s: { id: b.myId, x: 0, z: 0, h: 0, u: 0, v: 0, r: 0, i: [0, 0, 0, 0, 0], lap: 2, fin: 61.2 } });
  check('finish stamped by the server', await until(() => fins.length === 1) && fins[0] >= 40, `${fins[0]} ms`);
  const full = await c.join('QWRT').then(() => '', (e) => (e as { type: string }).type);
  check('joining a racing room: type racing (Lobby shows it)', full === 'racing');
  a.close();
  check('host leaves: the guest loses its host', await until(() => leftB.includes(atB[0]?.[0] ?? '?')));
  b.close(); c.close();

  // HybridLink: server first, PeerJS when the server is down or does not know the code
  const fakePeer = (): NetLink & { calls: string[] } => {
    const calls: string[] = [];
    return { calls, myId: 'peer-id', onMsg: () => {}, onJoin: () => {}, onLeave: () => {}, onError: () => {}, host: async (code) => { calls.push(`host ${code}`); }, join: async (code) => { calls.push(`join ${code}`); }, send: () => {}, broadcast: () => {}, kick: () => {}, close: () => {} };
  };
  const p1 = fakePeer();
  const up = new HybridLink(new ServerLink(url, ws), p1);
  await up.host('HXST', true);
  check('hybrid: hosts on the server when it answers', up.via === 'server' && p1.calls.length === 0);
  const p2 = fakePeer();
  const guest = new HybridLink(new ServerLink(url, ws), p2);
  await guest.join('PEER');
  check('hybrid: unknown on the server -> asks PeerJS', guest.via === 'peer' && p2.calls[0] === 'join PEER');
  await guest.join('HXST');
  check('hybrid: a server room is joined on the server', guest.via === 'server');
  up.close(); guest.close();
  let now = 0;
  const p3 = fakePeer();
  const dead = new HybridLink(new ServerLink('ws://127.0.0.1:1/ws/', ws), p3, () => now);
  await dead.host('DEAD');
  check('hybrid: server down -> hosts on PeerJS', dead.via === 'peer' && p3.calls[0] === 'host DEAD');
  const t0 = Date.now();
  await dead.join('ABCD');
  check('hybrid: server skipped for a minute after a failure (no wait)', Date.now() - t0 < 200 && p3.calls[1] === 'join ABCD');
  check('hybrid: room list empty while the server is down', (await dead.rooms()).length === 0);
  now = 61000;
  check("hybrid: retried after a minute", (await dead.rooms()).length === 0 && !dead.serverKnown);
  dead.close();
} finally {
  proc.kill();
}

const web = { protocol: 'https:', host: 'notcarlos.mosidealus.nl', hostname: 'notcarlos.mosidealus.nl' };
check('lobby address: same site /ws/ over wss', lobbyUrl(web, false, null) === 'wss://notcarlos.mosidealus.nl/ws/');
check('lobby address: dev server has none, override wins', lobbyUrl({ protocol: 'http:', host: 'localhost:5173', hostname: 'localhost' }, false, null) === null && lobbyUrl(web, false, 'ws://127.0.0.1:8770/ws/') === 'ws://127.0.0.1:8770/ws/');
check('lobby address: the app uses the game server', lobbyUrl({ protocol: 'capacitor:', host: 'localhost', hostname: 'localhost' }, true, null) === 'wss://notcarlos.mosidealus.nl/ws/');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
