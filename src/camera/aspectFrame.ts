import { clamp, smoothstep } from '../core/math';

/** Reference shape the chase camera was tuned on. */
export const REF_ASPECT = 16 / 9;
/** Widest horizontal view (degrees) on ultrawide screens: wider than this stretches the edges like a fisheye. */
const MAX_HFOV = 112;
/** Widest vertical view (degrees) in portrait. */
const MAX_VFOV = 96;
/** Share of the reference horizontal view kept in portrait (1 = all of it, very wide vertically). */
const PORTRAIT_KEEP = 0.62;

const DEG = Math.PI / 180;

/** Per-aspect framing applied on top of the chase tuning. */
export interface Framing {
  /** Vertical field of view in degrees for a tuned (16:9) vertical fov. */
  fov: number;
  /** Multiplies the chase distance. */
  dist: number;
  /** Multiplies the chase height. */
  height: number;
  /** Extra metres the camera looks ahead (keeps the next corner in view in portrait). */
  lookAhead: number;
}

/**
 * Framing for a screen shape (width / height). Wider than 16:9 keeps the vertical view until the horizontal one would
 * pass MAX_HFOV ("hor+" then capped); narrower widens the vertical view so most of the horizontal view survives, and
 * portrait also pulls the camera back and up a little so the road ahead and the next corner stay in view.
 * Pure and allocation-free when `out` is passed.
 */
export function framing(aspect: number, tunedFov: number, out: Framing = { fov: 60, dist: 1, height: 1, lookAhead: 0 }): Framing {
  const a = clamp(Number.isFinite(aspect) && aspect > 0 ? aspect : REF_ASPECT, 0.3, 5);
  const halfV = Math.tan((tunedFov * DEG) / 2);
  let fov = tunedFov;
  if (a > REF_ASPECT) {
    const hfov = (2 * Math.atan(halfV * a)) / DEG;
    if (hfov > MAX_HFOV) fov = (2 * Math.atan(Math.tan((MAX_HFOV * DEG) / 2) / a)) / DEG;
  } else if (a < REF_ASPECT) {
    const keepAll = (2 * Math.atan((halfV * REF_ASPECT) / a)) / DEG; // vertical fov that keeps the full 16:9 width
    fov = Math.min(MAX_VFOV, tunedFov + (keepAll - tunedFov) * PORTRAIT_KEEP);
  }
  const portrait = smoothstep(1.25, 0.56, a); // 0 at 5:4 and wider, 1 at 9:16
  out.fov = Math.max(tunedFov * 0.45, fov);
  out.dist = 1 + 0.22 * portrait;
  out.height = 1 + 0.4 * portrait;
  out.lookAhead = 5 * portrait;
  return out;
}

/** Horizontal field of view (degrees) of a vertical fov at an aspect. */
export const horizontalFov = (vfov: number, aspect: number): number => (2 * Math.atan(Math.tan((vfov * DEG) / 2) * aspect)) / DEG;
