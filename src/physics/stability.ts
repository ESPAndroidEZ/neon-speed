import { smoothstep } from '../core/math';
import type { CarTuning } from './carTuning';

/**
 * Slide stability, the arcade part of the handling. Three small effects, all per-car data in `CarTuning`:
 * - `slideDamp`: yaw damping grows with the slide angle, which stops the snap-back fishtail after a drift;
 * - `brakeStab`: extra yaw damping while braking at speed, so braking with the wheel turned does not swap ends;
 * - `slideCap` / `slideGain`: past the cap angle a restoring yaw moment builds, so a drift settles at a big angle
 *   instead of becoming a spin.
 * Handbrake (`hb`: rear grip factor, 1 = released): the slide window moves out by up to `HB_EXTRA` rad so the
 * car can swing wide, but the limits stay at full strength past it. (Fading them out let the front axle keep
 * yawing the car past 90 deg: it ended up rolling backwards and, with the wheel still turned, drove off the
 * OTHER way.) With the handbrake released this is exactly the approved STANDARD handling.
 * Pure arithmetic, no allocation.
 */
const HB_EXTRA = 0.3;

/** 0 with the handbrake released, 1 with it fully on (hb eases back to 1 after release). */
const hbShare = (t: CarTuning, hb: number): number => 1 - smoothstep(t.handbrakeGrip, 1, hb);

export function slideDamping(t: CarTuning, u: number, v: number, brake: number, hb: number): number {
  const beta = Math.abs(Math.atan2(v, Math.max(Math.abs(u), 3)));
  const extra = HB_EXTRA * hbShare(t, hb);
  return 1 + t.slideDamp * smoothstep(0.12 + extra, 0.6 + extra, beta) + t.brakeStab * brake * smoothstep(8, 25, Math.abs(u));
}

/** Restoring yaw acceleration (rad/s^2) once the slide angle passes `slideCap` (wider while handbraking). */
export function slideYaw(t: CarTuning, u: number, v: number, hb: number): number {
  const speed = Math.sqrt(u * u + v * v); // total speed: u alone collapses when the car is sideways
  if (t.slideGain <= 0 || speed < 4) return 0;
  const beta = Math.atan2(v, u);
  const over = Math.abs(beta) - t.slideCap - HB_EXTRA * hbShare(t, hb);
  if (over <= 0) return 0;
  return Math.sign(beta) * t.slideGain * Math.min(over, 0.7) * smoothstep(4, 12, speed);
}

/**
 * Handbrake momentum carry (arcade): while the handbrake is working, the velocity is swung toward where the
 * nose points, so a handbrake turn tightens the line instead of sliding wide and scrubbing off half the speed.
 * Returns the angle (rad) to rotate (u, v) by this step; scaled by weather grip so snow stays loose. Forward only.
 */
const HB_CARRY = 2.6;
export function handbrakeCarry(t: CarTuning, u: number, v: number, hb: number, grip: number, dt: number): number {
  if (u < 2) return 0;
  const share = hbShare(t, hb);
  if (share <= 0) return 0;
  const beta = Math.atan2(v, u);
  return -HB_CARRY * Math.max(-0.9, Math.min(0.9, beta)) * share * Math.min(1, grip) * smoothstep(2, 8, u) * dt;
}

/**
 * Drift hold: the rear-grip target once the handbrake is released. After a handbrake entry (rear grip still
 * recovering, hb < 0.985), staying on the throttle while the car is sliding keeps the rear loose, so the slide can be
 * held through a corner: more throttle = bigger angle, steer sets the line, lifting off or straightening ends it.
 * Reuses `hb` (already saved state), so grip driving, the AI and restored races are unaffected.
 */
const DRIFT_HOLD = 0.66;
export function driftHoldTarget(t: CarTuning, u: number, v: number, throttle: number, hb: number): number {
  if (hb >= 0.985 || u < 7 || throttle < 0.25) return 1;
  const slip = Math.abs(Math.atan2(v, u));
  if (slip < 0.07) return 1;
  const k = smoothstep(0.25, 0.9, throttle) * smoothstep(0.07, 0.16, slip);
  return 1 - (1 - Math.max(DRIFT_HOLD, t.handbrakeGrip)) * k;
}
