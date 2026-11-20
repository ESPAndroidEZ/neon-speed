import type { RoadGraph } from '../types/world';
import { createRng } from '../core/rng';
import { SIDEWALK } from '../world/roads/grammar';

const WALK = 1.35; // m/s
const SPAWN_R = 220, DESPAWN_R = 300;
/** A car this close (m) makes a pedestrian step back onto the far edge of the sidewalk; closer still and they are gone. */
const DODGE_R = 6, CLEAR_R = 2.2;

/**
 * People walking the sidewalks of Neon Harbor (pure, fixed pool, no allocation per step). Each walks along one side of a
 * street (turning back at the block's end), and is recycled in a ring around the player. They never get run over: a
 * car nearby makes them step back toward the buildings, and one that still comes too close sends them off-screen (respawn).
 */
export class RoamPeds {
  readonly x: Float32Array;
  readonly z: Float32Array;
  readonly h: Float32Array;
  /** Walk cycle phase per person (for the view's bob). */
  readonly phase: Float32Array;
  private readonly edge: Int32Array;
  private readonly dir: Int8Array;
  private readonly side: Int8Array;
  private readonly s: Float32Array;
  private readonly back: Float32Array; // 0 = kerb side of the sidewalk, 1 = building side
  private readonly g: RoadGraph;
  private readonly rnd: () => number;
  private readonly near: number[] = [];
  private nx = 1e9; private nz = 1e9;
  private cars: Float32Array | null = null; private nCars = 0; // last step's cars: respawns keep away from them

  constructor(g: RoadGraph, count = 30, seed = 11) {
    this.g = g;
    this.rnd = createRng(seed);
    this.x = new Float32Array(count); this.z = new Float32Array(count); this.h = new Float32Array(count); this.phase = new Float32Array(count);
    this.edge = new Int32Array(count); this.dir = new Int8Array(count); this.side = new Int8Array(count); this.s = new Float32Array(count); this.back = new Float32Array(count);
  }

  get count(): number {
    return this.x.length;
  }

  scatter(px: number, pz: number): void {
    this.collect(px, pz);
    for (let i = 0; i < this.count; i++) this.respawn(i, px, pz);
  }

  /** `cars`: x, z pairs of everything that drives (player first, then traffic), n pairs. */
  step(dt: number, px: number, pz: number, cars: Float32Array, n: number): void {
    this.cars = cars; this.nCars = n;
    for (let i = 0; i < this.count; i++) {
      if (Math.hypot(this.x[i] - px, this.z[i] - pz) > DESPAWN_R) { this.respawn(i, px, pz); continue; }
      let nearest = Infinity;
      for (let c = 0; c < n; c++) nearest = Math.min(nearest, Math.hypot(cars[c * 2] - this.x[i], cars[c * 2 + 1] - this.z[i]));
      if (nearest < CLEAR_R) { this.respawn(i, px, pz); continue; }
      const want = nearest < DODGE_R ? 1 : 0;
      this.back[i] += Math.max(-dt * 1.5, Math.min(dt * 3, want - this.back[i])); // a quick step back, a slow return
      const e = this.g.edges[this.edge[i]];
      this.s[i] += this.dir[i] * WALK * dt * (want ? 0.3 : 1);
      this.phase[i] += dt * 7;
      const lo = this.g.nodes[e.a].radius + SIDEWALK + 1, hi = e.length - this.g.nodes[e.b].radius - SIDEWALK - 1;
      if (this.s[i] < lo || this.s[i] > hi) { this.s[i] = Math.min(hi, Math.max(lo, this.s[i])); this.dir[i] = -this.dir[i]; } // the block's end: turn back (no walking through junctions yet)
      this.pose(i);
    }
  }

  private pose(i: number): void {
    const e = this.g.edges[this.edge[i]];
    let k = 0;
    while (k + 2 < e.cum.length && e.cum[k + 1] < this.s[i]) k++;
    const len = e.cum[k + 1] - e.cum[k] || 1, t = Math.min(1, Math.max(0, (this.s[i] - e.cum[k]) / len));
    const tx = (e.pts[k * 2 + 2] - e.pts[k * 2]) / len, tz = (e.pts[k * 2 + 3] - e.pts[k * 2 + 1]) / len;
    const lat = this.side[i] * (e.width / 2 + SIDEWALK * (0.3 + 0.55 * this.back[i]));
    this.x[i] = e.pts[k * 2] + tx * len * t + tz * lat;
    this.z[i] = e.pts[k * 2 + 1] + tz * len * t - tx * lat;
    this.h[i] = Math.atan2(tx * this.dir[i], tz * this.dir[i]);
  }

  private collect(px: number, pz: number): void {
    this.nx = px; this.nz = pz;
    this.near.length = 0;
    for (const e of this.g.edges) {
      if (e.kind === 'bridge' || e.kind === 'runway' || e.kind === 'highway' || e.district === 'industrial') continue;
      const m = Math.floor(e.cum.length / 2) * 2, d = Math.hypot(e.pts[m] - px, e.pts[m + 1] - pz);
      if (d < SPAWN_R) this.near.push(e.id);
    }
  }

  private respawn(i: number, px: number, pz: number): void {
    if (Math.hypot(px - this.nx, pz - this.nz) > 100) this.collect(px, pz);
    if (this.near.length === 0) return;
    for (let tries = 0; tries < 6; tries++) {
      const e = this.g.edges[this.near[Math.floor(this.rnd() * this.near.length)]];
      this.edge[i] = e.id; this.dir[i] = this.rnd() < 0.5 ? 1 : -1; this.side[i] = this.rnd() < 0.5 ? 1 : -1;
      const lo = this.g.nodes[e.a].radius + SIDEWALK + 1, hi = e.length - this.g.nodes[e.b].radius - SIDEWALK - 1;
      if (hi <= lo) continue;
      this.s[i] = lo + this.rnd() * (hi - lo); this.back[i] = 0; this.phase[i] = this.rnd() * 6.28;
      this.pose(i);
      let free = Math.hypot(this.x[i] - px, this.z[i] - pz) > 40; // never pop up right next to the player
      for (let c = 0; free && this.cars && c < this.nCars; c++) if (Math.hypot(this.cars[c * 2] - this.x[i], this.cars[c * 2 + 1] - this.z[i]) < 8) free = false;
      if (free) return;
    }
  }
}
