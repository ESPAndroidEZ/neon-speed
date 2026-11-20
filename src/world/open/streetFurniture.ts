import type { RoadGraph } from '../../types/world';
import { SIDEWALK } from '../roads/grammar';
import { heightAt } from '../roads/height';

/**
 * Street furniture along Neon Harbor's sidewalks (task 063-067 set, built by Claude): bins, benches, hydrants and one
 * bus stop per long avenue block. Pure placement (the geometry is furnitureGeo.ts). Each edge is seeded by its own id,
 * so a chunk asking for its edges gets the same items as every other chunk that shares an edge.
 */
export const FURNITURE_KINDS = ['bench', 'bin', 'hydrant', 'busStop'] as const;
export type FurnitureKind = (typeof FURNITURE_KINDS)[number];
/** Floats per item: kind index, x, z, heading (facing the road), y (sidewalk surface). */
export const FURN_STRIDE = 5;

const LAMP_EVERY = 34, WALK_Y = 0.16, GAP = 6; // lamp spacing as chunkGeo; min gap between items on one side (m)
const SKIP: ReadonlySet<string> = new Set(['highway', 'runway', 'bridge']);
const DENSITY: Record<string, number> = { strip: 1, downtown: 1, oldtown: 0.8, harbour: 0.4, industrial: 0.4, hills: 0.3, bay: 0 };
const NO_BENCH: ReadonlySet<string> = new Set(['harbour', 'industrial']);

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Point at distance s along an edge, offset `lat` to the left (+) or right (-): x, z, and the unit direction. */
function at(e: RoadGraph['edges'][number], s: number, lat: number, o: number[]): void {
  let k = 0;
  while (k + 2 < e.cum.length && e.cum[k + 1] < s) k++;
  const len = e.cum[k + 1] - e.cum[k] || 1, t = (s - e.cum[k]) / len;
  const tx = (e.pts[k * 2 + 2] - e.pts[k * 2]) / len, tz = (e.pts[k * 2 + 3] - e.pts[k * 2 + 1]) / len;
  const cx = e.pts[k * 2] + tx * len * t, cz = e.pts[k * 2 + 1] + tz * len * t;
  o[0] = cx + tz * lat; o[1] = cz - tx * lat; o[2] = tx; o[3] = tz;
  o[4] = (e.ys ? e.ys[k] + (e.ys[k + 1] - e.ys[k]) * t : heightAt(cx, cz)) + WALK_Y;
}

/** Items along the given edges (FURN_STRIDE floats each). */
export function placeFurniture(g: RoadGraph, edgeIds: readonly number[], seed: number): Float32Array {
  const out: number[] = [], p = [0, 0, 0, 0, 0];
  for (const id of edgeIds) {
    const e = g.edges[id];
    const dens = DENSITY[e.district] ?? 0;
    if (SKIP.has(e.kind) || dens <= 0) continue;
    const r = rng((seed ^ Math.imul(id + 1, 0x9e3779b1)) >>> 0);
    const w = e.width / 2, s0 = g.nodes[e.a].radius + 6, s1 = e.length - g.nodes[e.b].radius - 6;
    if (s1 - s0 < 10) continue;
    const add = (kind: number, s: number, side: number, lat: number): void => {
      at(e, s, side * lat, p);
      const h = Math.atan2(-p[3] * side, p[2] * side); // facing the road: towards the centre line
      out.push(kind, p[0], p[1], h, p[4]);
    };
    const nearLamp = (s: number, side: number): boolean => { // lamps stand at 17 + 34 n, alternate sides starting left
      const n = Math.round((s - LAMP_EVERY / 2) / LAMP_EVERY), ls = LAMP_EVERY / 2 + n * LAMP_EVERY;
      return (n % 2 === 0 ? 1 : -1) === side && Math.abs(s - ls) < 2.5;
    };
    const bus = e.kind === 'avenue' && e.length > 100 && e.district !== 'hills' ? (s0 + s1) / 2 : -1;
    for (const side of [1, -1]) {
      const taken: number[] = [];
      if (bus > 0 && side === -1) { add(3, bus, side, w + SIDEWALK - 0.9); taken.push(bus - 2, bus + 2); } // shelter: right-hand side
      const free = (s: number): boolean => s > s0 && s < s1 && !nearLamp(s, side) && taken.every((t) => Math.abs(t - s) >= GAP);
      const plan: [number, number, number, number][] = [[1, 40, 60, w + SIDEWALK / 2], [0, 70, 110, w + SIDEWALK / 2 + 0.4], [2, 75, 105, w + 0.9]]; // kind, min, max spacing, offset
      for (const [kind, lo, hi, lat] of plan) {
        if (kind === 0 && NO_BENCH.has(e.district)) continue;
        for (let s = s0 + r() * lo; s < s1; s += lo + r() * (hi - lo)) {
          if (r() > dens) continue;
          let q = s;
          for (let t = 0; t < 4 && !free(q); t++) q += 2.7;
          if (!free(q)) continue;
          taken.push(q);
          add(kind, q, side, lat);
        }
      }
    }
  }
  return Float32Array.from(out);
}
