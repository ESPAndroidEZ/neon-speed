import type { CarTuning } from '../physics/carTuning';

/** Fine-tuning sliders with safe ranges. They trade one thing for another, so they never change a car's rating much. */
export interface Setup {
  /** Final drive multiplier 0.85..1.15: shorter (higher) = quicker acceleration, lower top speed. */
  finalDrive: number;
  /** Spring stiffness -1 soft .. +1 stiff: stiff loses less grip in roll but is snappier. */
  spring: number;
  /** Ride height -1 low .. +1 high (centre of gravity). */
  rideHeight: number;
  /** Brake bias shift, -0.1 (rearward) .. +0.1 (frontward) around the car's own value. */
  brakeBias: number;
  /** Steering sensitivity multiplier 0.7..1.3 (on top of the settings screen value). */
  steer: number;
  /** Differential lock 0 open .. 1 locked: more traction and drift control, less rotation on entry. */
  diff: number;
  /** Tyre pressure -1 low .. +1 high: low = grip, high = less rolling drag. */
  pressure: number;
  /** Downforce 0..1: grip for drag. */
  downforce: number;
}

export const defaultSetup = (): Setup => ({ finalDrive: 1, spring: 0, rideHeight: 0, brakeBias: 0, steer: 1, diff: 0.3, pressure: 0, downforce: 0 });

/** Slider ranges for the screen and for sanitising: [min, max, step]. */
export const SETUP_RANGES: Record<keyof Setup, readonly [number, number, number]> = {
  finalDrive: [0.85, 1.15, 0.01], spring: [-1, 1, 0.1], rideHeight: [-1, 1, 0.1], brakeBias: [-0.1, 0.1, 0.01], steer: [0.7, 1.3, 0.05], diff: [0, 1, 0.05], pressure: [-1, 1, 0.1], downforce: [0, 1, 0.05],
};

export function sanitizeSetup(raw: unknown): Setup {
  const d = defaultSetup();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(d) as (keyof Setup)[]) {
    const v = r[k];
    const [lo, hi] = SETUP_RANGES[k];
    d[k] = typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d[k];
  }
  return d;
}

/** Apply the setup to a tuning in place (after upgrades). The default setup changes nothing. */
export function applySetup(t: CarTuning, s: Setup): void {
  t.finalDrive *= s.finalDrive;
  t.loadSens *= 1 - 0.12 * s.spring;
  t.driftAssist *= 1 - 0.1 * s.spring;
  t.cgHeight += 0.03 * s.rideHeight;
  t.brakeBias = Math.min(0.78, Math.max(0.5, t.brakeBias + s.brakeBias));
  t.driftAssist += 0.1 * (s.diff - 0.3);
  const grip = 1 - 0.02 * s.pressure + 0.04 * s.downforce;
  t.gripFront *= grip;
  t.gripRear *= grip;
  t.rollingResistance *= 1 - 0.15 * s.pressure;
  t.dragCoef *= 1 + 0.14 * s.downforce;
}
