/* Neon Harbor streaming (world/open/streamer.ts, chunkIndex.ts) with a fake clock: nearest chunks first, the frame
 * budget holds, the live set stays bounded while driving across the city, far chunks are disposed, and the chunk
 * index covers every road and building. */
import { Streamer } from '../src/world/open/streamer.ts';
import { chunkIndex, chunkCount, cellOf, CHUNK } from '../src/world/open/chunkIndex.ts';
import { generateRoads } from '../src/world/roads/generate.ts';
import { generateFootprints } from '../src/world/open/footprints.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
let now = 0;
const built: number[] = [], gone: number[] = [];
const PART_MS = 0.8, PARTS = 4; // each chunk: 4 slices of 0.8 ms
const s = new Streamer<{ i: number }>({
  n: 48, clock: () => now,
  start: (i) => { let k = 0; return { next: () => { now += PART_MS; return ++k < PARTS ? { done: false, value: undefined } : (built.push(i), { done: true, value: { i } }); } }; },
  dispose: (i) => gone.push(i),
});
s.update(24, 24);
check('first frame stays inside the budget plus one slice', s.lastMs <= 3 + PART_MS, `${s.lastMs.toFixed(1)} ms`);
check('the camera chunk is built first', built[0] === 24 * 48 + 24 || s.live.size === 0);
for (let f = 0; f < 60 && s.pending; f++) s.update(24, 24);
check('5 x 5 ring built', s.live.size === 25 && s.pending === 0, `${s.live.size} live`);
let maxLive = 0;
for (let x = 24; x < 47; x++) for (let f = 0; f < 3; f++) { s.update(x, 24); maxLive = Math.max(maxLive, s.live.size); }
check('driving across the map: live chunks stay bounded (<= 7 x 7)', maxLive <= 49, `max ${maxLive}`);
check('chunks behind are disposed', gone.length > 0 && [...s.live.keys()].every((i) => Math.abs((i % 48) - 46) <= 3));
check('every update within budget plus one slice', s.maxMs <= 3 + PART_MS, `max ${s.maxMs.toFixed(1)} ms`);
s.update(0, 0);
check('teleport: the far ring is dropped at once', [...s.live.keys()].every((i) => (i % 48) <= 3 && Math.floor(i / 48) <= 3));
s.clear();
check('clear disposes everything', s.live.size === 0 && s.pending === 0);

const g = generateRoads(7), fs = generateFootprints(g), ci = chunkIndex(g, fs), n = chunkCount(g);
check('48 x 48 chunks of 128 m', n === 48 && ci.length === 48 * 48 && CHUNK === 128);
check('every building is in exactly one chunk', ci.reduce((a, c) => a + c.buildings.length, 0) === fs.length);
check('every road edge is in some chunk', g.edges.every((e) => ci.some((c) => c.edges.includes(e.id))));
const busiest = Math.max(...ci.map((c) => c.buildings.length));
check('no chunk holds an absurd number of buildings (<= 120)', busiest <= 120, `max ${busiest}`);
const mid = ci[cellOf(g, 0) * n + cellOf(g, 0)];
check('the centre chunk is downtown with roads', mid.district === 'downtown' && mid.edges.length > 0, `${mid.district}, ${mid.edges.length} edges`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
