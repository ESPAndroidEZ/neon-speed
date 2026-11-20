import type { Footprint, RoadGraph } from '../../types/world';
import { createRng } from '../../core/rng';
import { GRAMMAR, SIDEWALK, isWater } from '../roads/grammar';
import { RoadIndex, createRoadHit } from '../roads/roadIndex';
import { GridHash } from '../roads/spatial';

/** Free space between the sidewalk and a building front (m). */
const SETBACK = 1.5;
const MAX_HALF = 45; // largest building half extent (industrial halls): the overlap hash reach

/** Corner k (0..3) of a footprint: centre +- front axis * hd +- side axis * hw. */
export function cornerOf(f: Footprint, k: number, out: { x: number; z: number }): void {
  const fx = Math.sin(f.rot), fz = Math.cos(f.rot); // local +Z (the front)
  const sx = fz, sz = -fx; // local +X
  const a = k & 1 ? -1 : 1, b = k & 2 ? -1 : 1;
  out.x = f.x + fx * f.hd * a + sx * f.hw * b;
  out.z = f.z + fz * f.hd * a + sz * f.hw * b;
}

/** Separating-axis test of two footprints (rectangles), with `pad` metres of clearance. */
export function overlaps(p: Footprint, q: Footprint, pad = 0): boolean {
  const ax = [Math.sin(p.rot), Math.cos(p.rot), Math.sin(q.rot), Math.cos(q.rot)];
  const dx = q.x - p.x, dz = q.z - p.z;
  for (let i = 0; i < 2; i++) {
    const fx = ax[i * 2], fz = ax[i * 2 + 1];
    for (const [ux, uz] of [[fx, fz], [fz, -fx]] as const) {
      const r = (f: Footprint): number => {
        const gx = Math.sin(f.rot), gz = Math.cos(f.rot);
        return f.hd * Math.abs(gx * ux + gz * uz) + f.hw * Math.abs(gz * ux - gx * uz);
      };
      if (Math.abs(dx * ux + dz * uz) > r(p) + r(q) + pad) return false;
    }
  }
  return true;
}

/**
 * Buildings along every street, from the district grammar (lot frontage, depth, height, gap, empty share). Deterministic
 * for a graph and seed. A lot is dropped when any part of it is on a road or its sidewalk, in the water, or on another
 * building. Pure (no three): the chunk builder makes the meshes, the free-roam contact uses them as walls.
 */
export function generateFootprints(g: RoadGraph, seed = g.seed): Footprint[] {
  const rnd = createRng(seed * 7919 + 13);
  const idx = new RoadIndex(g);
  const hash = new GridHash(g.half, 64);
  const out: Footprint[] = [];
  const p = { x: 0, z: 0 }, c = { x: 0, z: 0 }, hit = createRoadHit();
  const clear = (x: number, z: number): boolean => {
    if (isWater(x, z) || Math.abs(x) > g.half - 8 || Math.abs(z) > g.half - 8) return false;
    const h = idx.nearest(x, z, hit);
    if (h.edge < 0) return true;
    const e = g.edges[h.edge], a = g.nodes[e.a], b = g.nodes[e.b];
    if (Math.hypot(x - a.x, z - a.z) < a.radius + SIDEWALK || Math.hypot(x - b.x, z - b.z) < b.radius + SIDEWALK) return false;
    return h.dist > e.width / 2 + SIDEWALK + 0.5;
  };
  const range = (r: readonly [number, number]): number => r[0] + (r[1] - r[0]) * rnd();
  for (const e of g.edges) {
    if (e.kind === 'bridge' || e.kind === 'runway') continue;
    const gr = GRAMMAR[e.district];
    if (gr.empty >= 1) continue;
    const a = g.nodes[e.a], b = g.nodes[e.b];
    for (const side of [1, -1]) {
      let s = a.radius + SIDEWALK + 2;
      while (s < e.length - b.radius - SIDEWALK - 2) {
        const front = range(gr.lot), depth = range(gr.depth);
        const mid = s + front / 2;
        s += front + gr.gap;
        if (rnd() < gr.empty || mid + front / 2 > e.length - b.radius - SIDEWALK) continue;
        const head = idx.pointAt(e.id, mid, side * (e.width / 2 + SIDEWALK + SETBACK + depth / 2), p);
        const towers = e.district === 'downtown' ? Math.max(0.25, 1 - Math.hypot(p.x, p.z) / 1400) : 1; // tallest near the centre
        const f: Footprint = {
          x: p.x, z: p.z, hw: front / 2, hd: depth / 2, rot: head + (side > 0 ? -Math.PI / 2 : Math.PI / 2),
          height: Math.round(gr.height[0] + (gr.height[1] - gr.height[0]) * rnd() * towers), style: Math.floor(rnd() * 8), district: e.district,
        };
        let ok = clear(f.x, f.z);
        for (let k = 0; k < 4 && ok; k++) { cornerOf(f, k, c); ok = clear(c.x, c.z); }
        if (!ok) continue;
        const near = hash.at(f.x, f.z);
        if (near.some((i) => overlaps(f, out[i], 0.2))) continue;
        hash.insert(out.length, f.x - 2 * MAX_HALF, f.z - 2 * MAX_HALF, f.x + 2 * MAX_HALF, f.z + 2 * MAX_HALF); // any overlapping lot has its centre within 2 x MAX_HALF
        out.push(f);
      }
    }
  }
  return out;
}
