/* Neon Harbor chunk geometry (world/open/chunkGeo.ts): every chunk builds fast, no NaN, faces point the right way
 * (walls outward, roofs/roads/ground up), and the worst 5 x 5 live ring stays inside the LOW triangle budget. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { generateFootprints } from '../src/world/open/footprints.ts';
import { chunkIndex, chunkCount } from '../src/world/open/chunkIndex.ts';
import { chunkGeo, triangles, type Geo } from '../src/world/open/chunkGeo.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), fs = generateFootprints(g), ci = chunkIndex(g, fs), n = chunkCount(g);
const tris = new Float64Array(ci.length);
let nan = 0, worstMs = 0, badUp = 0, badOut = 0, total = 0;
const faceN = (o: Geo, t: number): [number, number, number] => {
  const [a, b, c] = [o.idx[t * 3], o.idx[t * 3 + 1], o.idx[t * 3 + 2]].map((i) => [o.pos[i * 3], o.pos[i * 3 + 1], o.pos[i * 3 + 2]]);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
};
const t0 = performance.now();
for (let i = 0; i < ci.length; i++) {
  const s = performance.now();
  const cg = chunkGeo(g, fs, ci[i]);
  worstMs = Math.max(worstMs, performance.now() - s);
  for (const o of Object.values(cg)) { tris[i] += triangles(o); if (o.pos.some((v) => !Number.isFinite(v))) nan++; }
  for (const o of [cg.road, cg.ground, cg.walk, cg.water, cg.lamps]) for (let t = 0; t < triangles(o); t++) if (faceN(o, t)[1] <= 0) badUp++;
  for (const o of [cg.walls, cg.roofs, cg.signs]) for (let t = 0; t < triangles(o); t++) { // walls, roofs and lamp posts: each face points where its stored normal says
    const fn = faceN(o, t), vi = o.idx[t * 3];
    if (fn[0] * o.nrm[vi * 3] + fn[1] * o.nrm[vi * 3 + 1] + fn[2] * o.nrm[vi * 3 + 2] <= 0) badOut++;
  }
  total += tris[i];
}
const all = performance.now() - t0;
check('whole city geometry in under 4 s (worst chunk under 40 ms)', all < 4000 && worstMs < 40, `${all.toFixed(0)} ms total, worst ${worstMs.toFixed(1)} ms, ${(total / 1e6).toFixed(2)} M triangles`);
check('no NaN in any chunk', nan === 0, String(nan));
check('roads, sidewalks, ground, water and light pools face up', badUp === 0, String(badUp));
check('walls, roofs, lamp posts and signs face outward (match their normals)', badOut === 0, String(badOut));
let worst = 0;
for (let cz = 2; cz < n - 2; cz++) for (let cx = 2; cx < n - 2; cx++) {
  let s = 0;
  for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) s += tris[(cz + z) * n + cx + x];
  worst = Math.max(worst, s);
}
check('worst 5 x 5 live ring under 400k triangles (LOW budget 600k incl. cars)', worst < 400000, `${(worst / 1000).toFixed(0)}k`);
const mid = chunkGeo(g, fs, ci[(n / 2) * n + n / 2]);
check('the centre chunk has road, sidewalk, buildings, ground and street lights', triangles(mid.road) > 0 && triangles(mid.walk) > 0 && triangles(mid.walls) > 0 && triangles(mid.ground) > 0 && triangles(mid.lamps) >= 8, `${triangles(mid.lamps) / 2} lamps`);
const signs = ci.map((c) => [c, triangles(chunkGeo(g, fs, c).signs) / 2] as const);
const per = (d: string): number => signs.filter(([c]) => c.district === d).reduce((a, [, n]) => a + n, 0);
const hillsOnly = signs.filter(([c]) => c.buildings.length > 0 && c.buildings.every((i) => fs[i].district === 'hills'));
check('neon signs: the Strip is full of them, chunks with only hills houses have none', per('strip') / fs.filter((f) => f.district === 'strip').length > 0.5 && hillsOnly.every(([, n]) => n === 0), `strip ${per('strip')}, oldtown ${per('oldtown')}, downtown ${per('downtown')}; ${hillsOnly.length} hills-only chunks`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
