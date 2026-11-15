import type { TrackSample } from '../types/game';

/** The racing line of a track: lateral offsets from the centre line, line points, and the line's own curvature. */
export interface RacingLine {
  n: number;
  /** Metres between line points (about the sample spacing). */
  ds: number;
  /** Offset from the centre line, + = left of travel. */
  off: Float32Array;
  /** Line points. */
  x: Float32Array;
  z: Float32Array;
  /** Signed curvature of the line, 1/m, + = turning RIGHT (checked in tests/lab/turn-sign.mts); and its absolute value smoothed by taking the max over +/-3 points. */
  ks: Float32Array;
  k: Float32Array;
  /** Largest allowed |offset| per sample (keeps the car off the walls). */
  lim: Float32Array;
}

const cache = new WeakMap<readonly TrackSample[], Map<number, RacingLine>>();

/** Distance kept from the road edge: more when grip is low, because snow banks and puddles collect at the edges. */
export const marginFor = (grip: number): number => (grip > 0.7 ? 1.7 : grip > 0.5 ? 2.4 : 3.3);

/**
 * Apex-based line by relaxation: every point is pulled toward the midpoint of its neighbours (which straightens
 * the path and cuts corners), limited to the road minus a margin. The result swings wide, clips the apex and runs
 * wide again, instead of following the centre line. Cached per track.
 */
export function racingLine(track: readonly TrackSample[], margin = 1.7): RacingLine {
  let byMargin = cache.get(track);
  if (!byMargin) cache.set(track, (byMargin = new Map()));
  const hit = byMargin.get(margin);
  if (hit) return hit;
  const n = track.length;
  const ds = Math.hypot(track[1].position.x - track[0].position.x, track[1].position.z - track[0].position.z);
  const off = new Float32Array(n);
  const lim = new Float32Array(n);
  const x = new Float32Array(n);
  const z = new Float32Array(n);
  for (let i = 0; i < n; i++) lim[i] = Math.max(0.4, track[i].width / 2 - margin);
  const place = (i: number): void => {
    const s = track[i];
    x[i] = s.position.x + s.tangent.z * off[i];
    z[i] = s.position.z - s.tangent.x * off[i];
  };
  for (let i = 0; i < n; i++) place(i);
  for (let it = 0; it < 260; it++) {
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n;
      const b = (i + 1) % n;
      const s = track[i];
      // distance from the point to the midpoint of its neighbours, measured along the left normal
      const d = ((x[a] + x[b]) / 2 - x[i]) * s.tangent.z - ((z[a] + z[b]) / 2 - z[i]) * s.tangent.x;
      off[i] = Math.max(-lim[i], Math.min(lim[i], off[i] + d * 0.45));
      place(i);
    }
  }
  const ks = new Float32Array(n);
  const k = new Float32Array(n);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n;
    const b = (i + 1) % n;
    const ux = x[i] - x[a];
    const uz = z[i] - z[a];
    const vx = x[b] - x[i];
    const vz = z[b] - z[i];
    const cross = ux * vz - uz * vx;
    const d = Math.hypot(ux, uz) * Math.hypot(vx, vz) * Math.hypot(x[b] - x[a], z[b] - z[a]);
    ks[i] = d > 1e-6 ? (2 * cross) / d : 0;
    raw[i] = Math.abs(ks[i]);
  }
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let d = -3; d <= 3; d++) m = Math.max(m, raw[(i + d + n) % n]);
    k[i] = m;
  }
  const line = { n, ds, off, x, z, ks, k, lim };
  byMargin.set(margin, line);
  return line;
}

export interface SpeedLimits {
  /** Cornering acceleration the driver trusts, m/s^2. */
  aLat: number;
  aBrake: number;
  aAccel: number;
  vMax: number;
}

/** Speed along the line: corner speed from curvature, then braking and acceleration limits propagated round the loop. */
export function speedProfile(line: RacingLine, lim: SpeedLimits, out: Float32Array): void {
  const { n, ds, k } = line;
  for (let i = 0; i < n; i++) out[i] = Math.min(lim.vMax, Math.sqrt(lim.aLat / Math.max(k[i], 1e-4)));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n * 2 - 1; i >= 0; i--) {
      const a = i % n;
      const b = (i + 1) % n;
      out[a] = Math.min(out[a], Math.sqrt(out[b] * out[b] + 2 * lim.aBrake * ds));
    }
    for (let i = 0; i < n * 2; i++) {
      const a = i % n;
      const b = (i + 1) % n;
      out[b] = Math.min(out[b], Math.sqrt(out[a] * out[a] + 2 * lim.aAccel * ds + 25));
    }
  }
}
