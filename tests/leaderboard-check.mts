/* Online lap boards, client side (src/core/leaderboard.ts, src/game/lapFrames.ts) against a fake server: offline queue,
 * retry rules, best-per-board, board keys the PHP accepts, the 10 Hz trace, and that server/api/scores-tracks.php is
 * generated from the current maps. The PHP rules themselves: tests/lab/scores-php.mjs (server CLI). */
import { readFileSync } from 'node:fs';
import { Leaderboard, LB_QUEUE_KEY, boardKey, dailyKey } from '../src/core/leaderboard.ts';
import { LapFrames, LAP_HZ, bestLapOf } from '../src/game/lapFrames.ts';
import { TRACKS } from '../src/data/tracks/index.ts';
import { CARS } from '../src/data/cars.ts';
import { topLine } from '../src/ui/trackTop.ts';
import { scoreTracksPhp } from '../scripts/gen-score-tracks.mts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};

const mem = new Map<string, string>();
const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
let status = 0; // 0 = offline (fetch throws)
const seen: { board: string; ms: number }[] = [];
const fake = async (_u: string, init?: { body?: string; headers?: Record<string, string> }) => {
  if (status === 0) throw new Error('offline');
  if (init?.body) seen.push(JSON.parse(init.body));
  const s = status;
  return { status: s, json: async () => (s === 200 ? { ok: true, improved: true, rank: 2, of: 7, mine: 61000 } : { error: 'rejected: jump in the ghost' }) };
};
const lb = new Leaderboard('/api/scores.php', () => 'ABCDEFGHIJKLMNOPQRST', fake, store);
const e = (board: string, ms: number) => ({ board, ms, car: 'civic', f: [0, 0, 0, 0] });

const r1 = await lb.submit(e('kestrel:CLEAR:0', 62000));
check('offline: the lap is queued, not lost', r1.state === 'queued' && lb.queue().length === 1);
await lb.submit(e('kestrel:CLEAR:0', 61000));
await lb.submit(e('kestrel:CLEAR:0', 63000));
check('queue keeps only the best lap per board', lb.queue().length === 1 && lb.queue()[0].ms === 61000);
await lb.submit(e('neon:RAIN-A:1', 75000));
status = 409;
await lb.flush();
check('409 (player not synced yet): kept for later', lb.queue().length === 2);
status = 503;
await lb.flush();
check('503 (tables not there yet): kept for later', lb.queue().length === 2);
status = 404;
await lb.flush();
check('404 (API not deployed yet): kept for later', lb.queue().length === 2);
status = 200;
const sent = await lb.flush();
check('back online: queue sent oldest first and emptied', lb.queue().length === 0 && seen.at(-2)?.board === 'kestrel:CLEAR:0' && seen.at(-1)?.board === 'neon:RAIN-A:1');
const got = sent.get('kestrel:CLEAR:0');
check('reply carries rank and board size', got?.state === 'sent' && got.rank === 2 && got.of === 7);
status = 422;
const rej = await lb.submit(e('maze:SNOW-E:3', 50000));
check('422 (implausible lap): dropped with the reason', rej.state === 'rejected' && rej.why.includes('jump') && lb.queue().length === 0);
mem.set(LB_QUEUE_KEY, '{broken');
check('broken queue in storage reads as empty', lb.queue().length === 0);
const none = new Leaderboard('/x', () => null, fake, store);
check('no player code: nothing is sent', (await none.flush()).size === 0);

const KEY_RE = /^([a-z0-9-]{1,20}):([A-Z-]{5,6}):([0-3])$/, DAILY_RE = /^daily:(\d{5}):([a-z0-9-]{1,20}):([A-Z-]{5,6})$/;
const PHP_WX = ['CLEAR', 'RAIN-N', 'RAIN-A', 'RAIN-E', 'SNOW-N', 'SNOW-A', 'SNOW-E'];
const keys = TRACKS.flatMap((d) => (['CLEAR', 'RAIN', 'SNOW'] as const).flatMap((w) => (['NORMAL', 'AGGRESSIVE', 'EXTREME'] as const).map((l) => boardKey(d.id, w, l, 3))));
check('every board key matches the PHP pattern and weather list', keys.every((k) => KEY_RE.test(k) && PHP_WX.includes(k.split(':')[1])), keys[4]);
check('daily key matches the PHP pattern', DAILY_RE.test(dailyKey(20412, 'coast', 'SNOW', 'EXTREME')));
check('every car id is a valid board car', CARS.every((c) => /^[a-z0-9]{1,16}$/.test(c.id)));

const rec = new LapFrames();
for (let i = 0; i <= 600; i++) rec.record(i / 60, i, 0, 0, 0); // 10 s at 60 Hz
check('trace: 10 Hz of race time', rec.count === 10 * LAP_HZ + 1, `${rec.count}`);
rec.reset();
for (let i = 0; i <= 120; i++) rec.record(i / 12, i, 0, 0, 0); // 10 s at 12 fps: slow frames fill the gaps
check('trace: slow frames keep the timeline', rec.count === 101, `${rec.count}`);
const s = rec.slice(2, 5);
check('slice: one lap = time x 10 (+1) frames', s.length / 4 >= 31 && s.length / 4 <= 32, `${s.length / 4}`);
const b = bestLapOf([62.1, 58.4, 59.9]);
check('best lap and its start time', b.index === 1 && Math.abs(b.start - 62.1) < 1e-9);
check('server/api/scores-tracks.php is up to date with the maps', readFileSync('server/api/scores-tracks.php', 'utf8') === scoreTracksPhp(), 'run npx tsx scripts/gen-score-tracks.mts');
check('track card: empty board invites the first time', topLine(undefined).length > 5 && topLine({ top: [], of: 0 }) === topLine(undefined));
const line = topLine({ top: [{ name: 'Nia', ms: 58310, car: 'evo' }, { name: 'Bo', ms: 61005, car: 'm3' }], of: 9 });
check('track card: top 3 line with lap times', line.includes('1. Nia 0:58.31') && line.includes('2. Bo 1:01.00'), line);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
