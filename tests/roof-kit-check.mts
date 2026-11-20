/* Task 063 roof kit (world/open/roofKit.ts): deterministic, everything on the roof inside the footprint (0.8 m from the
 * edges), budget 220 triangles per building, valid indices, nothing on tiny roofs, side faces point away from their item. */
import { roofDetails } from '../src/world/open/roofKit.ts';
import type { Geo } from '../src/world/open/chunkGeo.ts';
import type { DistrictId, Footprint } from '../src/types/world.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const geo = (): Geo => ({ pos: [], nrm: [], uv: [], idx: [] });
const DS: DistrictId[] = ['downtown', 'harbour', 'industrial', 'oldtown', 'strip', 'hills'];
let s = 12345;
const rnd = (): number => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };

let outside = 0, below = 0, over = 0, badIdx = 0, badN = 0, nan = 0, total = 0, maxTris = 0;
const per: Record<string, number> = {};
for (let k = 0; k < 500; k++) {
  const f: Footprint = { x: (rnd() - 0.5) * 4000, z: (rnd() - 0.5) * 4000, hw: 2 + rnd() * 14, hd: 2 + rnd() * 14, rot: rnd() * Math.PI * 2, height: 6 + rnd() * 70, style: 0, district: DS[k % DS.length] };
  const roofY = rnd() * 40, o = geo();
  const tris = roofDetails(f, roofY, k, o);
  total += tris; maxTris = Math.max(maxTris, tris); per[f.district] = (per[f.district] ?? 0) + tris;
  if (tris > 220) over++;
  const fx = Math.sin(f.rot), fz = Math.cos(f.rot), sx = fz, sz = -fx;
  for (let v = 0; v < o.pos.length / 3; v++) {
    const dx = o.pos[v * 3] - f.x, dz = o.pos[v * 3 + 2] - f.z, lz = dx * fx + dz * fz, lx = dx * sx + dz * sz;
    if (Math.abs(lx) > f.hw - 0.8 + 1e-3 || Math.abs(lz) > f.hd - 0.8 + 1e-3) outside++;
    if (o.pos[v * 3 + 1] < roofY - 1e-6) below++;
  }
  if (o.pos.some((x) => !Number.isFinite(x))) nan++;
  if (o.idx.length % 3 || o.idx.some((i) => i >= o.pos.length / 3) || o.uv.length / 2 !== o.pos.length / 3 || o.nrm.length !== o.pos.length) badIdx++;
  for (let t = 0; t < o.idx.length / 3; t++) { // the winding agrees with the stored normal (front faces are what you see)
    const [a, b, c] = [o.idx[t * 3], o.idx[t * 3 + 1], o.idx[t * 3 + 2]].map((i) => [o.pos[i * 3], o.pos[i * 3 + 1], o.pos[i * 3 + 2]]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], vi = o.idx[t * 3];
    if (n[0] * o.nrm[vi * 3] + n[1] * o.nrm[vi * 3 + 1] + n[2] * o.nrm[vi * 3 + 2] <= 0) badN++;
  }
}
check('items stay 0.8 m inside the roof edges', outside === 0, `${outside} vertices outside`);
check('items sit on the roof (nothing below it)', below === 0, `${below}`);
check('at most 220 triangles per building', over === 0, `max ${maxTris}`);
check('valid arrays (indices, uv, normals, no NaN)', badIdx === 0 && nan === 0);
check('faces wound to match their normals', badN === 0, `${badN} of ${total}`);
check('districts get clutter (hills little, downtown most)', per.downtown > per.hills * 3 && total > 5000, JSON.stringify(per));

// outward: on roofs with boxes only (AC units, masts), each box is 4 side quads + a top quad; every side normal points
// away from its own box's centre
{
  let inward = 0, boxes = 0;
  for (let seed = 0; seed < 200; seed++) {
    const o = geo();
    roofDetails({ x: 5, z: -3, hw: 8, hd: 6, rot: seed * 0.37, height: 60, style: 0, district: 'downtown' }, 0, seed, o);
    const nv = o.pos.length / 3;
    if (!nv || nv % 20) continue; // a water tank's top fan would break the 20-vertex box blocks
    for (let b0 = 0; b0 < nv; b0 += 20) {
      boxes++;
      let cx = 0, cz = 0;
      for (let v = b0; v < b0 + 16; v++) { cx += o.pos[v * 3] / 16; cz += o.pos[v * 3 + 2] / 16; }
      for (let q = b0; q < b0 + 16; q += 4) {
        const mx = (o.pos[q * 3] + o.pos[(q + 2) * 3]) / 2 - cx, mz = (o.pos[q * 3 + 2] + o.pos[(q + 2) * 3 + 2]) / 2 - cz;
        if (o.nrm[q * 3] * mx + o.nrm[q * 3 + 2] * mz <= 0) inward++;
      }
    }
  }
  check('side faces point outward', boxes > 20 && inward === 0, `${inward} inward of ${boxes * 4} box sides`);
}
const a = geo(), b = geo();
const f0: Footprint = { x: 10, z: -20, hw: 9, hd: 7, rot: 0.3, height: 50, style: 0, district: 'downtown' };
roofDetails(f0, 12, 77, a); roofDetails(f0, 12, 77, b);
check('same seed, same roof', JSON.stringify(a) === JSON.stringify(b) && a.idx.length > 0);
check('nothing on a 2 x 2 m roof', roofDetails({ ...f0, hw: 1, hd: 1 }, 12, 1, geo()) === 0);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
