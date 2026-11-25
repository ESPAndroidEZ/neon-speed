import type { RoadGraph } from '../types/world';
import type { CarInput } from '../types/game';
import type { CarController } from './carController';

/**
 * A rival that races through the open city (in-city outrun, docs/research-open-world.md): follows a GPS route as a dense
 * polyline with a corner speed profile (v = sqrt(mu g R), then a backward braking pass), steers by pure pursuit
 * (look-ahead 6 m + 0.35 s of travel) and drives a real CarController, so it slides and hits walls like the player.
 * Pure; the route arrays are built once per race, `drive` allocates nothing.
 */
const MU_G = 0.82 * 9.81, BRAKE = 7, VMAX = 62;

export interface CityPath { x: Float32Array; z: Float32Array; s: Float32Array; v: Float32Array; length: number }

/** Route edges (in driving order from `nodes[0]`) as a polyline with points every ~4 m and a speed limit per point. */
export function cityPath(g: RoadGraph, nodes: readonly number[], edges: readonly number[], grip = 1): CityPath {
  const px: number[] = [], pz: number[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = g.edges[edges[i]], fwd = e.a === nodes[i], m = e.pts.length / 2;
    for (let k = 0; k < m; k++) {
      const j = fwd ? k : m - 1 - k, x = e.pts[j * 2], z = e.pts[j * 2 + 1];
      const lx = px[px.length - 1], lz = pz[pz.length - 1];
      if (lx === undefined) { px.push(x); pz.push(z); continue; }
      const d = Math.hypot(x - lx, z - lz), n = Math.floor(d / 4);
      for (let q = 1; q <= n; q++) { px.push(lx + ((x - lx) * q) / (n + 1)); pz.push(lz + ((z - lz) * q) / (n + 1)); }
      if (d > 0.5) { px.push(x); pz.push(z); }
    }
  }
  const n = px.length, x = Float32Array.from(px), z = Float32Array.from(pz), s = new Float32Array(n), v = new Float32Array(n);
  for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]);
  for (let i = 0; i < n; i++) {
    // turn over +-3 points (~12 m each side): radius from the heading change over that distance
    const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 3);
    const h1 = Math.atan2(x[Math.min(n - 1, a + 1)] - x[a], z[Math.min(n - 1, a + 1)] - z[a]), h2 = Math.atan2(x[b] - x[Math.max(0, b - 1)], z[b] - z[Math.max(0, b - 1)]);
    const turn = Math.abs(Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)));
    const r = turn > 1e-3 ? (s[b] - s[a]) / turn : 1e9;
    v[i] = Math.min(VMAX, Math.sqrt(MU_G * grip * r));
  }
  for (let i = n - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * BRAKE * grip * (s[i + 1] - s[i])));
  return { x, z, s, v, length: s[n - 1] };
}

/** Nearest path index to (x, z), searched from `hint` a little back and well ahead (progress only moves forward). */
export function progressIndex(p: CityPath, x: number, z: number, hint: number): number {
  let best = hint, bd = Infinity;
  for (let i = Math.max(0, hint - 4); i < Math.min(p.s.length, hint + 40); i++) {
    const d = (p.x[i] - x) ** 2 + (p.z[i] - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/** Nearest path index over the whole route (a respawn or a shortcut far from the last known spot). */
export function nearestIndex(p: CityPath, x: number, z: number): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < p.s.length; i++) { const d = (p.x[i] - x) ** 2 + (p.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
}

export class CityDriver {
  idx = 0;
  /** Speed multiplier from the caller's catch-up (capped like the race AI: <= 1.09, never above the corner limit). */
  pace = 1;

  readonly path: CityPath;

  constructor(path: CityPath) {
    this.path = path;
  }

  /** Fill `out` for this step. */
  drive(car: CarController, out: CarInput): void {
    const p = this.path, st = car.state, sp = Math.abs(st.speed);
    this.idx = progressIndex(p, st.position.x, st.position.z, this.idx);
    const look = 6 + sp * 0.35;
    let j = this.idx;
    while (j + 1 < p.s.length && p.s[j] - p.s[this.idx] < look) j++;
    const dx = p.x[j] - st.position.x, dz = p.z[j] - st.position.z;
    const sh = Math.sin(st.heading), ch = Math.cos(st.heading);
    const fwd = dx * sh + dz * ch, lat = dx * ch - dz * sh; // lat > 0: target to the LEFT (car +X)
    out.steer = Math.max(-1, Math.min(1, Math.atan2(lat, Math.max(0.5, fwd)) * 2.2));
    let want = p.v[this.idx];
    for (let k = this.idx; k < Math.min(p.s.length, this.idx + 12); k++) want = Math.min(want, p.v[k]); // the next ~45 m
    want *= this.pace;
    const e = want - sp;
    out.throttle = e > 0 ? Math.min(1, 0.4 + e * 0.25) : 0;
    out.brake = e < -1.5 ? Math.min(1, -e * 0.18) : 0;
    out.handbrake = false;
    out.nitro = e > 8 && Math.abs(out.steer) < 0.2;
  }

  /** Metres along the route. */
  get distance(): number { return this.path.s[this.idx]; }
}
