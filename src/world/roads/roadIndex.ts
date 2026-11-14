import type { RoadGraph, SurfaceType } from '../../types/world';
import { SIDEWALK } from './grammar';
import { GridHash } from './spatial';

export interface RoadHit {
  edge: number;
  /** Distance along the edge from node a, metres from the centre line (+ = left of a -> b) and unit tangent. */
  s: number;
  lateral: number;
  tx: number;
  tz: number;
  /** Absolute distance to the centre line; Infinity when no road is near. */
  dist: number;
}
export const createRoadHit = (): RoadHit => ({ edge: -1, s: 0, lateral: 0, tx: 0, tz: 1, dist: Infinity });

const REACH = 14; // how far beyond the tarmac a segment is still found (m)

/** Spatial index of every road segment: nearest road, surface under a point. Pure and allocation free after build. */
export class RoadIndex {
  readonly graph: RoadGraph;
  private readonly hash: GridHash;
  private readonly segEdge: number[] = [];
  private readonly segK: number[] = [];
  private readonly scratch = createRoadHit();

  constructor(graph: RoadGraph) {
    this.graph = graph;
    this.hash = new GridHash(graph.half, 48);
    for (const e of graph.edges) {
      const pad = e.width / 2 + REACH;
      for (let k = 0; k + 1 < e.cum.length; k++) {
        const [ax, az, bx, bz] = [e.pts[k * 2], e.pts[k * 2 + 1], e.pts[k * 2 + 2], e.pts[k * 2 + 3]];
        this.hash.insert(this.segEdge.length, Math.min(ax, bx) - pad, Math.min(az, bz) - pad, Math.max(ax, bx) + pad, Math.max(az, bz) + pad);
        this.segEdge.push(e.id);
        this.segK.push(k);
      }
    }
  }

  private test(seg: number, x: number, z: number, out: RoadHit): void {
    const e = this.graph.edges[this.segEdge[seg]];
    const k = this.segK[seg];
    const ax = e.pts[k * 2];
    const az = e.pts[k * 2 + 1];
    const dx = e.pts[k * 2 + 2] - ax;
    const dz = e.pts[k * 2 + 3] - az;
    const len = e.cum[k + 1] - e.cum[k];
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (len * len)));
    const px = x - (ax + dx * t);
    const pz = z - (az + dz * t);
    const d = Math.hypot(px, pz);
    if (d >= out.dist) return;
    out.dist = d;
    out.edge = e.id;
    out.s = e.cum[k] + len * t;
    out.tx = dx / len;
    out.tz = dz / len;
    out.lateral = px * out.tz - pz * out.tx; // left normal of (tx, tz) is (tz, -tx)
  }

  /** Nearest road within reach of (x, z); `out.dist` is Infinity when there is none. */
  nearest(x: number, z: number, out: RoadHit): RoadHit {
    out.dist = Infinity;
    out.edge = -1;
    const list = this.hash.at(x, z);
    for (let i = 0; i < list.length; i++) this.test(list[i], x, z, out);
    return out;
  }

  /** Nearest road anywhere (full scan when nothing is in reach): spawning, GPS, resets. */
  nearestAny(x: number, z: number, out: RoadHit): RoadHit {
    if (this.nearest(x, z, out).edge >= 0) return out;
    for (let i = 0; i < this.segEdge.length; i++) this.test(i, x, z, out);
    return out;
  }

  /** Point on an edge at distance `s`, offset `lateral` to the left; writes x, z into `out` and returns the heading a -> b. */
  pointAt(edge: number, s: number, lateral: number, out: { x: number; z: number }): number {
    const e = this.graph.edges[edge];
    let k = 0;
    while (k + 2 < e.cum.length && e.cum[k + 1] < s) k++;
    const len = e.cum[k + 1] - e.cum[k];
    const t = Math.min(1, Math.max(0, (s - e.cum[k]) / len));
    const tx = (e.pts[k * 2 + 2] - e.pts[k * 2]) / len;
    const tz = (e.pts[k * 2 + 3] - e.pts[k * 2 + 1]) / len;
    out.x = e.pts[k * 2] + tx * len * t + tz * lateral;
    out.z = e.pts[k * 2 + 1] + tz * len * t - tx * lateral;
    return Math.atan2(tx, tz);
  }

  /** What the tyres are on. `rain` 0..1 turns low spots of the tarmac into standing water; the quay edge is always wet. */
  surfaceAt(x: number, z: number, rain = 0): SurfaceType {
    const h = this.nearest(x, z, this.scratch);
    if (h.edge < 0) return 'grass';
    const e = this.graph.edges[h.edge];
    const a = this.graph.nodes[e.a];
    const b = this.graph.nodes[e.b];
    const onRoad = h.dist <= e.width / 2 || Math.hypot(x - a.x, z - a.z) < a.radius || Math.hypot(x - b.x, z - b.z) < b.radius;
    if (!onRoad) return h.dist <= e.width / 2 + SIDEWALK ? 'curb' : 'grass';
    if (z < -672) return 'wet';
    return rain > 0.3 && Math.sin(x * 0.11) * Math.cos(z * 0.09) + 0.4 * Math.sin((x - z) * 0.031) > 1.42 - 0.5 * rain ? 'wet' : 'asphalt';
  }
}
