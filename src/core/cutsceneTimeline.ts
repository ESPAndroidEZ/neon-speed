import { easeInOutCubic, easeInOutSine, lerp } from './math';

/** Cutscene data types and the pure timeline maths (no three.js: unit tested). Coordinates are metres around the showroom stage (the car at 0,0,0; +X left of the car, +Z its nose). */
export type V3 = readonly [number, number, number];
export type CutEase = 'inOut' | 'sine' | 'linear';

/** One take: the camera either moves in a straight line or orbits a point, always looking from `look` to `lookTo`. */
export interface CutShot {
  dur: number;
  /** 'move': from -> to. */
  from?: V3;
  to?: V3;
  /** 'orbit': around `center` (x, z), radius, angle (rad, 0 = +Z side) and height from the first value to the second. */
  orbit?: { center: readonly [number, number]; r: readonly [number, number]; angle: readonly [number, number]; h: readonly [number, number] };
  look: V3;
  lookTo?: V3;
  fov: readonly [number, number];
  ease?: CutEase;
  /** Handheld shake in metres (0 = locked off). */
  shake?: number;
}

export type CutClip = 'idle' | 'walk' | 'lean' | 'armsCrossed' | 'wave' | 'cheer' | 'phone' | 'talk';
export interface CutActor {
  id: string;
  /** Position and what the actor looks at (x, z), all around the stage. */
  at: readonly [number, number];
  face: readonly [number, number];
  clip: CutClip;
  /** Later clip changes: [seconds, clip]. */
  then?: readonly (readonly [number, CutClip])[];
}
export interface CutLine { at: number; dur: number; who: string; text: string }

export interface Cutscene {
  id: string;
  /** Name shown on the replay list. */
  title: string;
  /** Big card at the start (chapter openers). */
  card?: { kicker: string; title: string };
  shots: readonly CutShot[];
  actors: readonly CutActor[];
  lines: readonly CutLine[];
  /** Story flag that must be set / unset for this cutscene to play. */
  if?: string;
  unless?: string;
}

export interface CutSample { px: number; py: number; pz: number; lx: number; ly: number; lz: number; fov: number; shot: number }

const EASE: Record<CutEase, (t: number) => number> = { inOut: easeInOutCubic, sine: easeInOutSine, linear: (t) => t };

export const cutDuration = (shots: readonly CutShot[]): number => shots.reduce((a, s) => a + s.dur, 0);

/** Camera at time `t` (seconds from the start): which take, position, look-at point and field of view. Writes into `out`. */
export function sampleCut(shots: readonly CutShot[], t: number, out: CutSample): CutSample {
  let acc = 0;
  let i = 0;
  while (i < shots.length - 1 && t >= acc + shots[i].dur) acc += shots[i++].dur;
  const s = shots[i];
  const u = Math.min(1, Math.max(0, (t - acc) / s.dur));
  const k = EASE[s.ease ?? 'inOut'](u);
  if (s.orbit) {
    const o = s.orbit;
    const a = lerp(o.angle[0], o.angle[1], k), r = lerp(o.r[0], o.r[1], k);
    out.px = o.center[0] + Math.sin(a) * r;
    out.pz = o.center[1] + Math.cos(a) * r;
    out.py = lerp(o.h[0], o.h[1], k);
  } else {
    const f = s.from ?? [0, 1.5, 6], g = s.to ?? f;
    out.px = lerp(f[0], g[0], k);
    out.py = lerp(f[1], g[1], k);
    out.pz = lerp(f[2], g[2], k);
  }
  const l0 = s.look, l1 = s.lookTo ?? l0;
  out.lx = lerp(l0[0], l1[0], k);
  out.ly = lerp(l0[1], l1[1], k);
  out.lz = lerp(l0[2], l1[2], k);
  out.fov = lerp(s.fov[0], s.fov[1], k);
  out.shot = i;
  return out;
}

/** The caption on screen at `t`, or null. The later line wins when two overlap. */
export function activeLine(lines: readonly CutLine[], t: number): CutLine | null {
  let hit: CutLine | null = null;
  for (const l of lines) if (t >= l.at && t < l.at + l.dur) hit = l;
  return hit;
}

/** Actor clip at `t` (the last `then` entry whose time has passed). */
export function clipAt(a: CutActor, t: number): CutClip {
  let c = a.clip;
  for (const [at, clip] of a.then ?? []) if (t >= at) c = clip;
  return c;
}

/** Yaw that makes something at `at` face `target` (our heading convention: forward = (sin h, cos h)). */
export const yawToward = (at: readonly [number, number], target: readonly [number, number]): number => Math.atan2(target[0] - at[0], target[1] - at[1]);
