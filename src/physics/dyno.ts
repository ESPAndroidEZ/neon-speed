import { smoothstep } from '../core/math';
import type { CarTuning } from './carTuning';

export interface DynoCurve {
  rpm: number[];
  /** Newton metres at the crank (with full boost on turbo cars). */
  torque: number[];
  /** Horsepower. */
  power: number[];
  peakTorque: { rpm: number; value: number };
  peakPower: { rpm: number; value: number };
}

/** Engine torque and power across the rev range, from the same formula the drivetrain uses (full throttle, full boost). */
export function dynoCurve(t: CarTuning, points = 36): DynoCurve {
  const out: DynoCurve = { rpm: [], torque: [], power: [], peakTorque: { rpm: 0, value: 0 }, peakPower: { rpm: 0, value: 0 } };
  for (let i = 0; i < points; i++) {
    const rpm = t.idleRpm + ((t.redlineRpm - t.idleRpm) * i) / (points - 1);
    const x = (rpm - t.peakRpm) / t.torqueWidth;
    const boost = t.turboTorque > 0 ? smoothstep(t.turboRpm, t.turboRpm + 1800, rpm) : 0;
    const torque = t.engineTorque * Math.max(0.3, 1 - x * x) * (1 + t.turboTorque * boost);
    const power = (torque * rpm) / 7127;
    out.rpm.push(rpm);
    out.torque.push(torque);
    out.power.push(power);
    if (torque > out.peakTorque.value) out.peakTorque = { rpm, value: torque };
    if (power > out.peakPower.value) out.peakPower = { rpm, value: power };
  }
  return out;
}
