import type { TrackSample } from '../types/game';

/** Pure track data (no three). Samples are evenly spaced along the closed centre line. */
export interface Track {
  readonly name: string;
  readonly samples: TrackSample[];
  readonly spacing: number;
  readonly length: number;
  /** Half of the drivable width, metres. */
  readonly halfWidth: number;
  /** Lateral distance from the centre line to the barrier, metres. */
  readonly barrierOffset: number;
}

export type Ctrl = readonly (readonly [number, number])[];

/** Centripetal Catmull-Rom point (Barry-Goldman) for t in [0,1] between p1 and p2. */
function crPoint(p0: readonly number[], p1: readonly number[], p2: readonly number[], p3: readonly number[], t: number, out: number[]): void {
  const knot = (a: readonly number[], b: readonly number[]): number => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-4;
  const t0 = 0;
  const t1 = t0 + knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  for (let k = 0; k < 2; k++) {
    const a1 = ((t1 - tt) / (t1 - t0)) * p0[k] + ((tt - t0) / (t1 - t0)) * p1[k];
    const a2 = ((t2 - tt) / (t2 - t1)) * p1[k] + ((tt - t1) / (t2 - t1)) * p2[k];
    const a3 = ((t3 - tt) / (t3 - t2)) * p2[k] + ((tt - t2) / (t3 - t2)) * p3[k];
    const b1 = ((t2 - tt) / (t2 - t0)) * a1 + ((tt - t0) / (t2 - t0)) * a2;
    const b2 = ((t3 - tt) / (t3 - t1)) * a2 + ((tt - t1) / (t3 - t1)) * a3;
    out[k] = ((t2 - tt) / (t2 - t1)) * b1 + ((tt - t1) / (t2 - t1)) * b2;
  }
}

/** Build a closed track from control points, resampled to uniform arc length. */
export function createTrack(name: string, ctrl: Ctrl, width: number, spacing = 3, barrierOffset = width / 2 + 2): Track {
  const n = ctrl.length;
  const dense: number[][] = [];
  const tmp = [0, 0];
  for (let i = 0; i < n; i++) {
    for (let s = 0; s < 48; s++) {
      crPoint(ctrl[(i + n - 1) % n], ctrl[i], ctrl[(i + 1) % n], ctrl[(i + 2) % n], s / 48, tmp);
      dense.push([tmp[0], tmp[1]]);
    }
  }
  const m = dense.length;
  const cum: number[] = [0];
  for (let i = 1; i <= m; i++) {
    const a = dense[i - 1];
    const b = dense[i % m];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[m];
  const count = Math.round(total / spacing);
  const step = total / count;
  const pts: number[][] = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const d = i * step;
    while (cum[j + 1] < d) j++;
    const f = (d - cum[j]) / (cum[j + 1] - cum[j]);
    const a = dense[j];
    const b = dense[(j + 1) % m];
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  const samples: TrackSample[] = pts.map((p, i) => {
    const a = pts[(i + count - 1) % count];
    const b = pts[(i + 1) % count];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { position: { x: p[0], y: 0, z: p[1] }, tangent: { x: (b[0] - a[0]) / len, y: 0, z: (b[1] - a[1]) / len }, width };
  });
  return { name, samples, spacing: step, length: total, halfWidth: width / 2, barrierOffset };
}

/** Signed curvature (1/m) at sample i; positive = turning left (heading increases). */
export function curvatureAt(track: Track, i: number): number {
  const n = track.samples.length;
  const a = track.samples[(i + n - 1) % n].tangent;
  const b = track.samples[(i + 1) % n].tangent;
  const ha = Math.atan2(a.x, a.z);
  const hb = Math.atan2(b.x, b.z);
  let d = hb - ha;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d / (2 * track.spacing);
}
