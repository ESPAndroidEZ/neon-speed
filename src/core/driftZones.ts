import type { RoadGraph } from '../types/world';

/** A drift zone: a circle around a big junction (x, z, radius m). */
export interface DriftZone { id: number; x: number; z: number; r: number }

/** Six zones at the biggest junctions of the industrial and harbour districts, at least 500 m apart. Deterministic. */
export function placeDriftZones(g: RoadGraph, count = 6): DriftZone[] {
  const spots = g.nodes.filter((n) => (n.district === 'industrial' || n.district === 'harbour') && n.edges.length >= 3)
    .sort((a, b) => b.edges.length - a.edges.length || b.radius - a.radius || a.id - b.id);
  const out: DriftZone[] = [];
  for (const n of spots) {
    if (out.length >= count) break;
    if (out.some((z) => Math.hypot(z.x - n.x, z.z - n.z) < 500)) continue;
    out.push({ id: out.length, x: n.x, z: n.z, r: 50 });
  }
  return out;
}

/**
 * One drift run at a time: entering a zone starts it, the score is the drift points earned since (bank + chain of the
 * car's DriftScorer), leaving ends it. `update` returns 1 on enter, 2 on exit (score in `score`), 0 otherwise. Pure, no allocation.
 */
export class DriftRun {
  zone = -1;
  /** The zone of the current or the last finished run (for the result). */
  last = -1;
  score = 0;
  private base = 0;
  private readonly zones: readonly DriftZone[];

  constructor(zones: readonly DriftZone[]) {
    this.zones = zones;
  }

  update(x: number, z: number, points: number): 0 | 1 | 2 {
    if (this.zone >= 0) {
      const zn = this.zones[this.zone];
      this.score = Math.max(0, Math.round(points - this.base));
      if (Math.hypot(x - zn.x, z - zn.z) > zn.r + 5) { this.zone = -1; return 2; } // 5 m grace so a wide line at the edge counts
      return 0;
    }
    for (let i = 0; i < this.zones.length; i++) {
      const zn = this.zones[i];
      if (Math.hypot(x - zn.x, z - zn.z) < zn.r) { this.zone = i; this.last = i; this.base = points; this.score = 0; return 1; }
    }
    return 0;
  }

  /** Abandon a run (teleport): no score. */
  cancel(): void {
    this.zone = -1;
    this.score = 0;
  }
}
