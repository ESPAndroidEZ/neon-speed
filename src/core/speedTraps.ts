import type { RoadGraph } from '../types/world';

/** One speed camera: a line across the road at (x, z), along the road's direction (tx, tz), half as wide as the road + 4 m. */
export interface SpeedTrap { id: number; edge: number; x: number; z: number; tx: number; tz: number; half: number }

/**
 * Speed traps for Free Drive: on the longest straight avenues and highways (the middle of each, never two on the same
 * line of road within 600 m). Pure and deterministic for a graph.
 */
export function placeSpeedTraps(g: RoadGraph, count = 12): SpeedTrap[] {
  const straight = g.edges.filter((e) => (e.kind === 'avenue' || e.kind === 'highway' || e.kind === 'coast') && e.cum.length === 2 && e.length > 100 && !e.tunnel) // lattice blocks are 128 m
    .sort((a, b) => b.limit - a.limit || b.length - a.length || a.id - b.id); // fastest roads first
  const out: SpeedTrap[] = [];
  for (const e of straight) {
    if (out.length >= count) break;
    const x = (e.pts[0] + e.pts[2]) / 2, z = (e.pts[1] + e.pts[3]) / 2;
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 600)) continue;
    out.push({ id: out.length, edge: e.id, x, z, tx: (e.pts[2] - e.pts[0]) / e.length, tz: (e.pts[3] - e.pts[1]) / e.length, half: e.width / 2 + 4 });
  }
  return out;
}

/**
 * Did the car cross trap `t` between the previous and the current position (either direction, within the road)? Pure,
 * no allocation: a sign change of the distance along the road, with the crossing point inside the trap's width.
 */
export function crossed(t: SpeedTrap, x0: number, z0: number, x1: number, z1: number): boolean {
  const a0 = (x0 - t.x) * t.tx + (z0 - t.z) * t.tz, a1 = (x1 - t.x) * t.tx + (z1 - t.z) * t.tz;
  if ((a0 < 0) === (a1 < 0) || a0 === a1) return false;
  const k = a0 / (a0 - a1), cx = x0 + (x1 - x0) * k, cz = z0 + (z1 - z0) * k;
  return Math.abs((cx - t.x) * t.tz - (cz - t.z) * t.tx) <= t.half;
}
