import type { CarTuning } from './carTuning';

/**
 * Driving style (setting `drivingStyle`). CLASSIC = the approved handling, bit for bit (nothing is touched).
 * STREET = grippier, sharper, stronger nitro: multipliers on the PLAYER's tuning at car build (data/carBuild applyBuild),
 * never inside the locked models (turbo, rain/snow grip, handbrake carry and drift hold). Weight transfer data stays as is.
 * Rivals keep their own tuning (aiTuning), so the AI never gets more than the player.
 */
export type DrivingStyle = 'CLASSIC' | 'STREET';
export const DRIVING_STYLES: readonly DrivingStyle[] = ['CLASSIC', 'STREET'];
export const STYLE: { id: DrivingStyle } = { id: 'CLASSIC' };

/** Street multipliers (measured in tests/lab/feel.mts, numbers in docs/feel.md). */
export const STREET_FEEL = {
  /** Tyre grip up on both axles (the extra lock below does the turn-in; equal-ish grip keeps a full-lock 100 km/h turn from spinning). */
  gripFront: 1.12,
  gripRear: 1.16,
  /** Lock keeps more angle at speed: sharper turn-in at street speeds. */
  steerFalloff: 1.15,
  minSteer: 1.08,
  /** Auto counter-steer when the stick centres mid-slide: a smoother drift exit. */
  driftAssist: 1.35,
  /** Drive costs more rear side grip: a slide starts easier on the gas (the floor stays: a lower one spun the clumsy bot in rain). */
  powerSlide: 1.25,
  /** Nitro: extra torque share x1.4, burns 20 % slower (a longer kick). */
  nitroExtra: 1.4,
  nitroBurn: 0.8,
  /** Faster yaw settling once a slide is caught. */
  yawDamping: 1.08,
} as const;

/** Apply the Street multipliers to a built tuning (in place). Pure, allocation free. */
export function streetTuning(t: CarTuning): void {
  const f = STREET_FEEL;
  t.gripFront *= f.gripFront;
  t.gripRear *= f.gripRear;
  t.steerFalloffSpeed *= f.steerFalloff;
  t.minSteerScale = Math.min(0.6, t.minSteerScale * f.minSteer);
  t.driftAssist = Math.min(1, t.driftAssist * f.driftAssist);
  t.powerSlide = Math.min(0.95, t.powerSlide * f.powerSlide);
  t.nitroTorqueMul = 1 + (t.nitroTorqueMul - 1) * f.nitroExtra;
  t.nitroBurnPerSec *= f.nitroBurn;
  t.yawDamping *= f.yawDamping;
}

/** The player's car at build: CLASSIC leaves the tuning untouched. */
export function applyStyle(t: CarTuning, style: DrivingStyle = STYLE.id): void {
  if (style === 'STREET') streetTuning(t);
}
