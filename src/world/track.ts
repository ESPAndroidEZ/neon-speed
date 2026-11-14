import type { TrackSample } from '../types/game';
import type { DensePath, Zone } from './streetPath';

/** Pure track data (no three). Samples are evenly spaced along the closed centre line. */
export interface Track {
  readonly name: string;
  readonly samples: TrackSample[];
  /** Zone of each sample (street, alley, plaza, tunnel, bridge, dock). */
  readonly zones: Zone[];
  /** Lateral distance from the centre line to the wall, per sample, metres. */
  readonly wall: Float32Array;
  readonly spacing: number;
  readonly length: number;
  /** Road surface height per sample, metres (visual only: the physics stays flat). */
  readonly heights: Float32Array;
  /** Samples driven to finish the race: all of them for a circuit, fewer for a point-to-point sprint. */
  readonly raceSamples: number;
}

/** Height control point: `at` is the fraction of the loop (0..1), `h` the road height in metres. */
export interface ElevationPoint {
  at: number;
  h: number;
}

export interface TrackOptions {
  /** Smooth (cosine) height profile; the loop wraps, so keep the first and last heights equal for a closed circuit. */
  elevation?: readonly ElevationPoint[];
  /** Sprint: the race ends at this fraction of the loop (the rest is the return road back to the grid). */
  sprintEnd?: number;
}

const WALL_GAP: Record<Zone, number> = { street: 0.7, alley: 0.6, plaza: 0.9, tunnel: 0.8, bridge: 1.0, dock: 1.0, boulevard: 0.8, yard: 0.6, cliff: 1.2 };

/** Half of the drivable width at sample i. */
export const halfWidthAt = (tr: Track, i: number): number => tr.samples[i].width / 2;

/** Resample a dense street path to even spacing, smoothing width changes over about 36 m. */
export function createTrackFromPath(name: string, path: DensePath, spacing = 3, start?: readonly [number, number], opts: TrackOptions = {}): Track {
  const pts = path.pts;
  const m = pts.length;
  const cum: number[] = [0];
  for (let i = 1; i <= m; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % m][0] - pts[i - 1][0], pts[i % m][1] - pts[i - 1][1]));
  const total = cum[m];
  const count = Math.round(total / spacing);
  const step = total / count;
  const xy: [number, number][] = [];
  const zones: Zone[] = [];
  const rawW: number[] = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const d = i * step;
    while (cum[j + 1] < d) j++;
    const f = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const a = pts[j];
    const b = pts[(j + 1) % m];
    xy.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    zones.push(f < 0.5 ? path.zone[j] : path.zone[(j + 1) % m]);
    rawW.push(path.width[j]);
  }
  // Rotate so index 0 is the sample nearest `start` (the start/finish line).
  if (start) {
    let best = 0;
    let bd = Infinity;
    xy.forEach((p, i) => {
      const d = Math.hypot(p[0] - start[0], p[1] - start[1]);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    const rot = <T>(a: T[]): T[] => a.slice(best).concat(a.slice(0, best));
    xy.splice(0, count, ...rot(xy));
    zones.splice(0, count, ...rot(zones));
    rawW.splice(0, count, ...rot(rawW));
  }
  const win = Math.max(1, Math.round(18 / step));
  const samples: TrackSample[] = xy.map((p, i) => {
    const a = xy[(i + count - 1) % count];
    const b = xy[(i + 1) % count];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let w = 0;
    for (let k = -win; k <= win; k++) w += rawW[(i + k + count * 4) % count];
    return { position: { x: p[0], y: 0, z: p[1] }, tangent: { x: (b[0] - a[0]) / len, y: 0, z: (b[1] - a[1]) / len }, width: w / (win * 2 + 1) };
  });
  const wall = new Float32Array(count);
  for (let i = 0; i < count; i++) wall[i] = samples[i].width / 2 + WALL_GAP[zones[i]];
  const heights = new Float32Array(count);
  const el = opts.elevation;
  if (el && el.length > 1) {
    const pts = [{ at: el[el.length - 1].at - 1, h: el[el.length - 1].h }, ...el, { at: el[0].at + 1, h: el[0].h }];
    for (let i = 0, k = 0; i < count; i++) {
      const f = i / count;
      while (k < pts.length - 2 && pts[k + 1].at <= f) k++;
      const t = Math.max(0, Math.min(1, (f - pts[k].at) / (pts[k + 1].at - pts[k].at || 1)));
      heights[i] = pts[k].h + (pts[k + 1].h - pts[k].h) * (0.5 - 0.5 * Math.cos(Math.PI * t));
      samples[i].position.y = heights[i];
    }
  }
  return { name, samples, zones, wall, spacing: step, length: total, heights, raceSamples: opts.sprintEnd ? Math.round(count * opts.sprintEnd) : count };
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

/** Index of the first sample whose zone is `zone` (or -1). */
export const firstOfZone = (tr: Track, zone: Zone): number => tr.zones.indexOf(zone);
