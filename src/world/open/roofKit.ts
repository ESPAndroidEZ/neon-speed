import type { Footprint } from '../../types/world';
import type { Geo } from './chunkGeo';

/**
 * Roof clutter for Neon Harbor buildings (task 063, built by Claude): AC units, water tanks on legs and antenna masts,
 * appended to the chunk's ROOFS arrays (same material, no extra draw call). Pure; deterministic from the seed.
 * Building frame: local x along the side (half size hw), local z along the front (half size hd), as `cornerOf`.
 */
const EDGE = 0.8, MAX_TRIS = 220;
/** [min, max] items per building by district; bay has no buildings. */
const COUNT: Record<string, [number, number]> = { downtown: [2, 5], harbour: [2, 4], industrial: [2, 4], oldtown: [1, 3], strip: [1, 3], hills: [0, 1], bay: [0, 0] };

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

interface Frame { f: Footprint; fx: number; fz: number; sx: number; sz: number; y: number }
const wx = (b: Frame, lx: number, lz: number): number => b.f.x + b.fx * lz + b.sx * lx;
const wz = (b: Frame, lx: number, lz: number): number => b.f.z + b.fz * lz + b.sz * lx;

/** One quad (4 corners, CCW seen from the normal side) with a face normal; uv 0..1. */
function face(o: Geo, p: readonly number[], n: readonly number[]): void {
  const b = o.pos.length / 3;
  for (let k = 0; k < 4; k++) { o.pos.push(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]); o.nrm.push(n[0], n[1], n[2]); }
  o.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
  o.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
}

/** Box in the building frame: centre (lx, lz), half sizes (hx, hz), from y0 to y1. Five faces (no bottom): 10 triangles. */
function box(o: Geo, b: Frame, lx: number, lz: number, hx: number, hz: number, y0: number, y1: number): void {
  const c = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([x, z]) => [wx(b, lx + x, lz + z), wz(b, lx + x, lz + z)]);
  for (let i = 0; i < 4; i++) {
    const p = c[i], q = c[(i + 1) % 4], ex = q[0] - p[0], ez = q[1] - p[1], L = Math.hypot(ex, ez) || 1;
    const nx = ez / L, nz = -ex / L; // outward for this corner order (tests/roof-kit-check.mts)
    face(o, [p[0], y0, p[1], p[0], y1, p[1], q[0], y1, q[1], q[0], y0, q[1]], [nx, 0, nz]);
  }
  face(o, [c[0][0], y1, c[0][1], c[3][0], y1, c[3][1], c[2][0], y1, c[2][1], c[1][0], y1, c[1][1]], [0, 1, 0]);
}

/** 8-sided prism (water tank), radius r, from y0 to y1, with a closed top: 24 triangles. */
function prism(o: Geo, b: Frame, lx: number, lz: number, r: number, y0: number, y1: number): void {
  const cx = wx(b, lx, lz), cz = wz(b, lx, lz), N = 8;
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
    const x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
    face(o, [x1, y0, z1, x0, y0, z0, x0, y1, z0, x1, y1, z1], [Math.cos(am), 0, Math.sin(am)]);
  }
  const base = o.pos.length / 3;
  o.pos.push(cx, y1, cz); o.nrm.push(0, 1, 0); o.uv.push(0.5, 0.5);
  for (let k = 0; k <= N; k++) { const a = (k / N) * Math.PI * 2; o.pos.push(cx + Math.cos(a) * r, y1, cz + Math.sin(a) * r); o.nrm.push(0, 1, 0); o.uv.push(0.5 + Math.cos(a) / 2, 0.5 + Math.sin(a) / 2); }
  for (let k = 0; k < N; k++) o.idx.push(base, base + k + 2, base + k + 1);
}

/** Adds roof items for one building to `out` (roofY = the flat roof's height); returns the triangles added. */
export function roofDetails(f: Footprint, roofY: number, seed: number, out: Geo): number {
  if (f.hw < 3 || f.hd < 3) return 0;
  const r = rng(seed), [lo, hi] = COUNT[f.district] ?? [0, 0];
  const n = lo + Math.floor(r() * (hi - lo + 1));
  if (n <= 0) return 0;
  const before = out.idx.length;
  const b: Frame = { f, fx: Math.sin(f.rot), fz: Math.cos(f.rot), sx: Math.cos(f.rot), sz: -Math.sin(f.rot), y: roofY };
  const used: number[] = []; // x, z, radius of placed items (no overlaps)
  const spot = (rad: number): [number, number] | null => {
    const mx = f.hw - EDGE - rad, mz = f.hd - EDGE - rad;
    if (mx <= 0 || mz <= 0) return null;
    for (let t = 0; t < 8; t++) {
      const x = (r() * 2 - 1) * mx, z = (r() * 2 - 1) * mz;
      if (used.every((u, i) => i % 3 || Math.hypot(u - x, used[i + 1] - z) > used[i + 2] + rad + 0.4)) { used.push(x, z, rad); return [x, z]; }
    }
    return null;
  };
  const tower = f.district === 'downtown' && f.height > 40;
  for (let i = 0; i < n; i++) {
    const tris = (out.idx.length - before) / 3;
    const roll = r();
    const kind = tower && i === 0 ? 'mast' : f.district === 'oldtown' ? (roll < 0.5 ? 'tank' : 'ac') : f.district === 'harbour' || f.district === 'industrial' ? (roll < 0.75 ? 'ac' : 'tank') : roll < 0.6 ? 'ac' : roll < 0.85 ? 'tank' : 'mast';
    const cost = kind === 'tank' ? 64 : 10;
    if (tris + cost > MAX_TRIS) break;
    if (kind === 'ac') { const p = spot(1.0); if (p) box(out, b, p[0], p[1], 0.8, 0.6, roofY, roofY + 1.0); }
    else if (kind === 'mast') { const p = spot(0.3); if (p) box(out, b, p[0], p[1], 0.075, 0.075, roofY, roofY + 4 + r() * 5); }
    else {
      const p = spot(1.5);
      if (!p) continue;
      for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) box(out, b, p[0] + dx, p[1] + dz, 0.08, 0.08, roofY, roofY + 0.8);
      prism(out, b, p[0], p[1], 1.4, roofY + 0.8, roofY + 3.4);
    }
  }
  return (out.idx.length - before) / 3;
}
