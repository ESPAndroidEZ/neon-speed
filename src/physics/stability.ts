import { smoothstep } from '../core/math';
import type { CarTuning } from './carTuning';

/**
 * Slide stability, the arcade part of the handling. Three small effects, all per-car data in `CarTuning`:
 * - `slideDamp`: yaw damping grows with the slide angle, which stops the snap-back fishtail after a drift;
 * - `brakeStab`: extra yaw damping while braking at speed, so braking with the wheel turned does not swap ends;
 * - `slideCap` / `slideGain`: past the cap angle a restoring yaw moment builds, so a drift settles at a big angle
 *   instead of becoming a spin.
 * The slide effects fade out while the handbrake is on (`hb`: rear grip factor), so handbrake turns still work.
 * Pure arithmetic, no allocation.
 */
export function slideDamping(t: CarTuning, u: number, v: number, brake: number, hb: number): number {
  const beta = Math.abs(Math.atan2(v, Math.max(Math.abs(u), 3)));
  return 1 + t.slideDamp * smoothstep(0.12, 0.6, beta) * smoothstep(t.handbrakeGrip, 1, hb) + t.brakeStab * brake * smoothstep(8, 25, Math.abs(u));
}

/** Restoring yaw acceleration (rad/s^2) once the slide angle passes `slideCap`. */
export function slideYaw(t: CarTuning, u: number, v: number, hb: number): number {
  if (t.slideGain <= 0 || u < 4) return 0;
  const beta = Math.atan2(v, u);
  const over = Math.abs(beta) - t.slideCap;
  if (over <= 0) return 0;
  const free = smoothstep(t.handbrakeGrip, 1, hb);
  return Math.sign(beta) * t.slideGain * Math.min(over, 0.7) * smoothstep(4, 12, u) * free;
}
