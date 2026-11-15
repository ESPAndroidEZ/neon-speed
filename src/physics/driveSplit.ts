import type { CarTuning } from './carTuning';

/** Per-axle drive result (reused object, written every step: no allocation). */
export interface DriveOut {
  /** Longitudinal force at each axle, N (front is along the steered wheels). */
  fxF: number;
  fxR: number;
  /** Share of each axle's traction the drive uses, 0..1 (taken from that axle's sideways grip). */
  useF: number;
  useR: number;
  /** A driven axle is asking for more than it can put down. */
  spin: boolean;
}

export const createDriveOut = (): DriveOut => ({ fxF: 0, fxR: 0, useF: 0, useR: 0, spin: false });

/** Drivetrain from `driveFront` (share of torque at the front): 0 = RWD, 1 = FWD, in between = AWD. */
export type Layout = 'FWD' | 'AWD' | 'RWD';
export const layoutOf = (t: CarTuning): Layout => (t.driveFront >= 0.99 ? 'FWD' : t.driveFront > 0.01 ? 'AWD' : 'RWD');

/**
 * Split the drive force (`want`, engine braking included) between the axles and cap each by its own traction:
 * RWD pushes the rear (power oversteer), FWD pulls the front (understeer under power, torque fights the steering),
 * AWD splits it and a centre coupling passes what one axle cannot use to the other (the AWD launch advantage).
 */
export function splitDrive(t: CarTuning, want: number, tractionF: number, tractionR: number, out: DriveOut): DriveOut {
  const f = t.driveFront;
  let wF = want * f;
  let wR = want - wF;
  if (f > 0.01 && f < 0.99) { // AWD centre coupling
    const spareF = Math.max(0, tractionF - Math.abs(wF)), spareR = Math.max(0, tractionR - Math.abs(wR));
    const overR = Math.max(0, Math.abs(wR) - tractionR), overF = Math.max(0, Math.abs(wF) - tractionF);
    const s = Math.sign(want);
    wF += s * Math.min(overR, spareF);
    wR += s * Math.min(overF, spareR);
  }
  out.spin = Math.abs(wF) > tractionF * 1.02 || Math.abs(wR) > tractionR * 1.02;
  out.fxF = Math.max(-tractionF, Math.min(tractionF, wF));
  out.fxR = Math.max(-tractionR, Math.min(tractionR, wR));
  out.useF = Math.abs(out.fxF) / (tractionF + 1);
  out.useR = Math.abs(out.fxR) / (tractionR + 1);
  return out;
}
