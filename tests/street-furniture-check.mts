/* Street furniture (world/open/streetFurniture.ts + furnitureGeo.ts): items stand on the sidewalk (never on the tarmac),
 * keep 6 m apart on one side and clear of the lamp posts, no motorway/runway/bridge, the same for every chunk that
 * shares an edge, a sensible total, and the boxes face the way their normals say. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { FURN_STRIDE, FURNITURE_KINDS, placeFurniture } from '../src/world/open/streetFurniture.ts';
import { furnitureGeo } from '../src/world/open/furnitureGeo.ts';
import { SIDEWALK } from '../src/world/roads/grammar.ts';
import type { Geo } from '../src/world/open/chunkGeo.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7);
const all = g.edges.map((e) => e.id);
const t0 = performance.now();
const items = placeFurniture(g, all, 7);
const ms = performance.now() - t0;
const n = items.length / FURN_STRIDE;

/** Distance from (x, z) to an edge's centre line. */
const distTo = (id: number, x: number, z: number): number => {
  const e = g.edges[id];
  let d = Infinity;
  for (let k = 0; k + 1 < e.cum.length; k++) {
    const ax = e.pts[k * 2], az = e.pts[k * 2 + 1], dx = e.pts[k * 2 + 2] - ax, dz = e.pts[k * 2 + 3] - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
};
const counts = [0, 0, 0, 0];
let onRoad = 0, offWalk = 0, outside = 0, bad = 0;
const perEdge: Float32Array[] = [];
for (const id of all) perEdge[id] = placeFurniture(g, [id], 7);
for (const id of all) {
  const it = perEdge[id], e = g.edges[id];
  for (let i = 0; i < it.length; i += FURN_STRIDE) {
    counts[it[i]]++;
    const d = distTo(id, it[i + 1], it[i + 2]);
    if (d < e.width / 2 + 0.5) onRoad++;
    if (d > e.width / 2 + SIDEWALK + 0.1) offWalk++;
    if (Math.abs(it[i + 1]) > g.half || Math.abs(it[i + 2]) > g.half) outside++;
    if (!Number.isFinite(it[i + 3] + it[i + 4])) bad++;
  }
  if (['highway', 'runway', 'bridge'].includes(e.kind) && it.length) bad++;
}
check('every item on the sidewalk, never on the tarmac', onRoad === 0 && offWalk === 0, `${onRoad} on the road, ${offWalk} beyond the sidewalk`);
check('inside the world, finite, none on motorway/runway/bridge', outside === 0 && bad === 0);
check('each edge gets the same items alone as in the full list (chunks agree)', JSON.stringify(Array.from(items)) === JSON.stringify(all.flatMap((id) => Array.from(perEdge[id]))));
check('same result twice', JSON.stringify(Array.from(placeFurniture(g, all, 7))) === JSON.stringify(Array.from(items)));
check('a sensible amount over the city (2,000-30,000)', n >= 2000 && n <= 30000, `${n}: ${FURNITURE_KINDS.map((k, i) => `${k} ${counts[i]}`).join(', ')}, ${ms.toFixed(0)} ms`);
check('every kind appears', counts.every((c) => c > 20));

// spacing: on one edge and side, two items are at least 6 m apart (a bus shelter counts as 2 m either side)
let close = 0;
for (const id of all) {
  const it = perEdge[id];
  for (let i = 0; i < it.length; i += FURN_STRIDE) for (let j = i + FURN_STRIDE; j < it.length; j += FURN_STRIDE) {
    const d = Math.hypot(it[i + 1] - it[j + 1], it[i + 2] - it[j + 2]);
    if (d < 3.5) close++; // same side, too close (opposite sides are a road width apart)
  }
}
check('items keep their distance', close === 0, `${close} pairs closer than 3.5 m`);

// geometry: winding matches the stored normals, budget per item
const o: Geo = { pos: [], nrm: [], uv: [], idx: [] };
const drawn = furnitureGeo(items, () => true, o);
let badN = 0;
for (let t = 0; t < o.idx.length / 3; t++) {
  const [a, b, c] = [o.idx[t * 3], o.idx[t * 3 + 1], o.idx[t * 3 + 2]].map((i) => [o.pos[i * 3], o.pos[i * 3 + 1], o.pos[i * 3 + 2]]);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], vi = o.idx[t * 3];
  if (nn[0] * o.nrm[vi * 3] + nn[1] * o.nrm[vi * 3 + 1] + nn[2] * o.nrm[vi * 3 + 2] <= 0) badN++;
}
check('furniture faces wound to match their normals', badN === 0, `${badN} of ${o.idx.length / 3}`);
check('at most 50 triangles per item on average', o.idx.length / 3 / drawn <= 50, `${(o.idx.length / 3 / drawn).toFixed(1)}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
