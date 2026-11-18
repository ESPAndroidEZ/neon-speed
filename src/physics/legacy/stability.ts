import { smoothstep } from '../../core/math';
import type { CarTuning } from '../carTuning';

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
/** Drivetrain character (owner, 2026-11-15): FWD = the handbrake is the efficient way round, AWD = turns on grip, RWD in between. */
const carryMul = (t: CarTuning): number => (t.driveFront >= 0.99 ? 1.15 : t.driveFront > 0.01 ? 0.6 : 0.85);
export function handbrakeCarry(t: CarTuning, u: number, v: number, hb: number, grip: number, dt: number): number {
  if (u < 2) return 0;
  const share = hbShare(t, hb);
  if (share <= 0) return 0;
  const beta = Math.atan2(v, u);
  return -HB_CARRY * carryMul(t) * Math.max(-0.9, Math.min(0.9, beta)) * share * Math.min(1, grip) * smoothstep(2, 8, u) * dt;
}

/**
 * Long handbrake hold (owner, 2026-11-17: "it keeps holding and that makes it harder to manage the car"): the first
 * HB_FULL seconds are the approved handbrake, untouched; after that its strength (rear grip loss, carry, brake force)
 * fades to HB_TAIL over HB_FADE seconds, so holding it through a corner no longer keeps the car spinning.
 * Owner, same day: "when stopping to use the handbrake, release it immediately; turning the other way and using the
 * handbrake must act immediately". So on release the rear goes to its no-handbrake target at HB_REGRIP per second
 * (about 0.1 s): full grip, or the approved drift hold while the driver stays on the throttle in a slide (lifting or
 * straightening ends it at once); a new pull bites at HB_BITE per second.
 */
const HB_FULL = 0.5, HB_FADE = 0.4, HB_TAIL = 0.2; // the approved flick is a 0.4-0.45 s pull: untouched
export const HB_REGRIP = 15, HB_BITE = 30;
export const handbrakeFade = (held: number): number => 1 - (1 - HB_TAIL) * smoothstep(HB_FULL, HB_FULL + HB_FADE, held);

/**
 * Handbrake hold bookkeeping, shared by both handling models: counts the seconds of the current pull (a new pull starts
 * from 0; after release the length of the last one is kept) and returns the rear-grip target and blend rate.
 */
export function handbrakeTarget(c: { hbHeld: number; hbFactor: number; flags: { handbrake: boolean } }, handbrake: boolean, hbGrip: number, dt: number, hold: () => number): [number, number] {
  if (handbrake) {
    c.hbHeld = c.flags.handbrake ? c.hbHeld + dt : 0;
    return [1 - (1 - hbGrip) * handbrakeFade(c.hbHeld), HB_BITE];
  }
  // released: the handbrake lets go at once; only the throttle drift hold (on the gas while sliding) keeps the rear loose
  return [hold(), c.hbFactor < 0.985 ? HB_REGRIP : 3];
}

/**
 * Drift hold: the rear-grip target once the handbrake is released. After a handbrake entry (rear grip still
 * recovering, hb < 0.985), staying on the throttle while the car is sliding keeps the rear loose, so the slide can be
 * held through a corner: more throttle = bigger angle, steer sets the line, lifting off or straightening ends it.
 * Reuses `hb` (already saved state), so grip driving, the AI and restored races are unaffected.
 */
const DRIFT_HOLD = 0.66;
const POWER_HOLD = 0.8; // RWD power slide: looser than grip, tighter than a handbrake drift ("not too aggressive")
export function driftHoldTarget(t: CarTuning, u: number, v: number, throttle: number, hb: number, grip = 1, steer = 1): number {
  const rwdPower = t.driveFront <= 0.01 && hb >= 0.985 && grip > 0.6; // not on snow/ice: the tail is loose there already // RWD: throttle alone can start and hold a slide
  if ((hb >= 0.985 && !rwdPower) || u < 7 || throttle < 0.25) return 1;
  const slip = Math.abs(Math.atan2(v, u));
  if (slip < 0.07) return 1;
  const keep = smoothstep(0.05, 0.3, Math.abs(steer)); // wheel centred = the driver is done with the slide: grip comes back and W accelerates
  if (rwdPower) return slip < 0.12 ? 1 : 1 - (1 - POWER_HOLD) * smoothstep(0.6, 1, throttle) * smoothstep(0.12, 0.22, slip) * keep;
  const k = smoothstep(0.25, 0.9, throttle) * smoothstep(0.07, 0.16, slip) * keep;
  const hold = t.driveFront > 0.01 && t.driveFront < 0.99 ? 0.78 : DRIFT_HOLD; // AWD: the front pulls it straight sooner
  return 1 - (1 - Math.max(hold, t.handbrakeGrip)) * k;
}
