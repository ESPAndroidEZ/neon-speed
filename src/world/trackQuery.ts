import type { Track } from './track';

/** Where a world point sits relative to the track. Reused; never allocate per query. */
export interface TrackHit {
  index: number;
  /** Signed lateral offset from the centre line, metres. + = left of travel direction. */
  lateral: number;
  /** Distance along the lap at the nearest sample, metres. */
  along: number;
}

export const createHit = (): TrackHit => ({ index: 0, lateral: 0, along: 0 });

const WINDOW = 14; // samples searched either side of the hint

/** Nearest-sample lookup. With `hint` it scans a small window (fast); with hint < 0 it scans everything. */
export function locate(track: Track, x: number, z: number, hint: number, out: TrackHit): TrackHit {
  const s = track.samples;
  const n = s.length;
  let best = 0;
  let bestD = Infinity;
  const full = hint < 0;
  const count = full ? n : WINDOW * 2 + 1;
  for (let k = 0; k < count; k++) {
    const i = full ? k : (hint - WINDOW + k + n * 2) % n;
    const dx = s[i].position.x - x;
    const dz = s[i].position.z - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const p = s[best];
  const dx = x - p.position.x;
  const dz = z - p.position.z;
  // left normal of tangent (tx, tz) is (tz, -tx)
  out.index = best;
  out.lateral = dx * p.tangent.z - dz * p.tangent.x;
  out.along = best * track.spacing + dx * p.tangent.x + dz * p.tangent.z;
  return out;
}
