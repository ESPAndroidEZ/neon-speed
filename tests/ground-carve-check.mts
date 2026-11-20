/* W5.7 fix (world/open/groundCarve.ts): the ground never pokes through a road or a sidewalk. Samples every road edge
 * of the hills chunks and of every 6th other chunk at the centre line, the tarmac edges and the sidewalk edges, finds the
 * ground triangle under each point in the chunk's real ground mesh and compares heights. Also: chunk borders match. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { generateFootprints } from '../src/world/open/footprints.ts';
import { chunkIndex, CHUNK } from '../src/world/open/chunkIndex.ts';
import { chunkGeo, type Geo } from '../src/world/open/chunkGeo.ts';
import { SIDEWALK } from '../src/world/roads/grammar.ts';
import { heightAt } from '../src/world/roads/height.ts';
import { groundAt } from '../src/world/open/groundCarve.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), fs = generateFootprints(g), ci = chunkIndex(g, fs);

/** Ground height under (x, z) from the mesh triangles (barycentric), or null when no ground triangle covers it (water). */
function meshY(o: Geo, x: number, z: number): number | null {
  for (let t = 0; t < o.idx.length / 3; t++) {
    const [a, b, c] = [o.idx[t * 3], o.idx[t * 3 + 1], o.idx[t * 3 + 2]];
    const ax = o.pos[a * 3], az = o.pos[a * 3 + 2], bx = o.pos[b * 3], bz = o.pos[b * 3 + 2], cx = o.pos[c * 3], cz = o.pos[c * 3 + 2];
    if (x < Math.min(ax, bx, cx) - 1e-6 || x > Math.max(ax, bx, cx) + 1e-6 || z < Math.min(az, bz, cz) - 1e-6 || z > Math.max(az, bz, cz) + 1e-6) continue;
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
    if (u >= -1e-6 && v >= -1e-6 && w >= -1e-6) return u * o.pos[a * 3 + 1] + v * o.pos[b * 3 + 1] + w * o.pos[c * 3 + 1];
  }
  return null;
}

let samples = 0, poke = 0, worst = 0, worstAt = '';
const hillsPoke = { n: 0, bad: 0 };
const t0 = performance.now();
for (let i = 0; i < ci.length; i++) {
  const info = ci[i];
  const hills = info.district === 'hills';
  if (!hills && i % 6) continue;
  const cg = chunkGeo(g, fs, info);
  const x0 = -g.half + info.cx * CHUNK, z0 = -g.half + info.cz * CHUNK;
  for (const id of info.edges) {
    const e = g.edges[id];
    if (e.kind === 'bridge') continue;
    const w = e.width / 2;
    for (let k = 0; k + 1 < e.cum.length; k++) {
      const ax = e.pts[k * 2], az = e.pts[k * 2 + 1], bx = e.pts[k * 2 + 2], bz = e.pts[k * 2 + 3], mx = (ax + bx) / 2, mz = (az + bz) / 2;
      if (mx < x0 || mx >= x0 + CHUNK || mz < z0 || mz >= z0 + CHUNK) continue;
      const len = Math.hypot(bx - ax, bz - az) || 1, nx = (bz - az) / len, nz = -(bx - ax) / len;
      const ya = e.ys ? e.ys[k] : heightAt(ax, az), yb = e.ys ? e.ys[k + 1] : heightAt(bx, bz);
      for (const f of [0.25, 0.5, 0.75]) for (const [l, dy] of [[0, 0.04], [w - 0.3, 0.04], [-w + 0.3, 0.04], [w + SIDEWALK - 0.3, 0.16], [-w - SIDEWALK + 0.3, 0.16]] as const) {
        const x = ax + (bx - ax) * f + nx * l, z = az + (bz - az) * f + nz * l;
        if (x < x0 || x >= x0 + CHUNK || z < z0 || z >= z0 + CHUNK) continue;
        const gy = meshY(cg.ground, x, z);
        if (gy === null) continue;
        const surf = ya + (yb - ya) * f + dy, over = gy - surf;
        samples++;
        if (hills) hillsPoke.n++;
        if (over > 0.02) { poke++; if (hills) hillsPoke.bad++; }
        if (over > worst) { worst = over; worstAt = `${x.toFixed(0)}, ${z.toFixed(0)} (${info.district})`; }
      }
    }
  }
}
const ms = performance.now() - t0;
check('the ground never covers a road or a sidewalk', poke === 0, `${poke} of ${samples} samples under the ground (hills ${hillsPoke.bad} of ${hillsPoke.n}), worst ${worst.toFixed(2)} m at ${worstAt}`);

// chunk borders: the shared edge of two neighbouring chunks has the same ground height from both sides
let crack = 0;
for (let k = 0; k < 400; k++) {
  const x = -g.half + (((k * 37) % 40) + 4) * CHUNK, z = -g.half + 1000 + ((k * 53) % 3000);
  if (Math.abs(groundAt(g, x - 1e-9, z) - groundAt(g, x, z)) > 1e-3) crack++;
}
check('chunk borders match (no cracks)', crack === 0, `${crack} of 400`);
let deep = 0;
for (let k = 0; k < 2000; k++) { const x = ((k * 7919) % 5000) - 2500, z = ((k * 104729) % 5000) - 2500, d = heightAt(x, z) - groundAt(g, x, z); if (d > 6) deep++; }
check('cuts stay shallow (ground at most 6 m under the terrain)', deep < 40, `${deep} of 2000 points cut deeper than 6 m`);
console.log(`(${samples} samples, ${ms.toFixed(0)} ms)`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
