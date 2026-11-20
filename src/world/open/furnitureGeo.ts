import type { Geo } from './chunkGeo';
import { FURN_STRIDE } from './streetFurniture';

/**
 * Street furniture as plain boxes appended to a chunk's ROOFS arrays (the dark material that also holds the lamp posts):
 * no new draw call. Item frame: local +z faces the road, local x along the kerb. Only items whose spot `own` accepts are
 * drawn (each item belongs to the chunk it stands in). Pure.
 */
type B = [number, number, number, number, number, number]; // centre lx, lz, half hx, hz, y0, y1 (metres above the sidewalk)
const SHAPES: readonly (readonly B[])[] = [
  [[0, 0.05, 0.9, 0.22, 0.42, 0.48], [0, -0.2, 0.9, 0.03, 0.48, 0.95], [-0.75, 0, 0.05, 0.2, 0, 0.42], [0.75, 0, 0.05, 0.2, 0, 0.42]], // bench
  [[0, 0, 0.25, 0.25, 0, 0.9]], // bin
  [[0, 0, 0.12, 0.12, 0, 0.62], [0, 0, 0.17, 0.17, 0.62, 0.72], [0, 0, 0.22, 0.06, 0.35, 0.45]], // hydrant
  [[0, 0, 1.6, 0.8, 2.35, 2.45], [0, -0.75, 1.6, 0.03, 0.1, 2.35], [-1.57, 0, 0.03, 0.75, 0.1, 2.35], [1.57, 0, 0.03, 0.75, 0.1, 2.35], [0, -0.45, 1.2, 0.2, 0.42, 0.48]], // bus shelter
];

function face(o: Geo, p: readonly number[], n: readonly number[]): void {
  const b = o.pos.length / 3;
  for (let k = 0; k < 4; k++) { o.pos.push(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]); o.nrm.push(n[0], n[1], n[2]); }
  o.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
  o.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
}

/** Five faces of a box (no bottom) at item (x, z, heading h, ground y). */
function box(o: Geo, x: number, z: number, h: number, y: number, s: B): void {
  const fx = Math.sin(h), fz = Math.cos(h), sx = fz, sz = -fx;
  const c = [[-s[2], -s[3]], [s[2], -s[3]], [s[2], s[3]], [-s[2], s[3]]].map(([a, b]) => [x + sx * (s[0] + a) + fx * (s[1] + b), z + sz * (s[0] + a) + fz * (s[1] + b)]);
  const y0 = y + s[4], y1 = y + s[5];
  let cx = 0, cz = 0;
  for (const q of c) { cx += q[0] / 4; cz += q[1] / 4; }
  for (let i = 0; i < 4; i++) {
    const p = c[i], q = c[(i + 1) % 4], ex = q[0] - p[0], ez = q[1] - p[1], L = Math.hypot(ex, ez) || 1;
    let nx = ez / L, nz = -ex / L;
    const out = nx * ((p[0] + q[0]) / 2 - cx) + nz * ((p[1] + q[1]) / 2 - cz) > 0;
    if (!out) { nx = -nx; nz = -nz; }
    if (out) face(o, [p[0], y0, p[1], p[0], y1, p[1], q[0], y1, q[1], q[0], y0, q[1]], [nx, 0, nz]);
    else face(o, [q[0], y0, q[1], q[0], y1, q[1], p[0], y1, p[1], p[0], y0, p[1]], [nx, 0, nz]);
  }
  const top = [c[0][0], y1, c[0][1], c[3][0], y1, c[3][1], c[2][0], y1, c[2][1], c[1][0], y1, c[1][1]];
  const ux = c[3][0] - c[0][0], uz = c[3][1] - c[0][1], vx = c[2][0] - c[0][0], vz = c[2][1] - c[0][1]; // CCW from above?
  if (uz * vx - ux * vz > 0) face(o, top, [0, 1, 0]);
  else face(o, [top[0], y1, top[2], top[9], y1, top[11], top[6], y1, top[8], top[3], y1, top[5]], [0, 1, 0]);
}

/** Appends the items `own` accepts; returns how many were drawn. */
export function furnitureGeo(items: Float32Array, own: (x: number, z: number) => boolean, out: Geo): number {
  let n = 0;
  for (let i = 0; i < items.length; i += FURN_STRIDE) {
    const x = items[i + 1], z = items[i + 2];
    if (!own(x, z)) continue;
    for (const s of SHAPES[items[i]]) box(out, x, z, items[i + 3], items[i + 4], s);
    n++;
  }
  return n;
}
