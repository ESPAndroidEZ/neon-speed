import { clamp, lerp, smoothstep } from '../core/math';
import type { Assist } from './assists';
import type { CarTuning } from './carTuning';

/**
 * Front wheel angle: less lock at speed (steering assist shrinks it further, PRO keeps more),
 * plus auto counter-steer when the stick is released mid-slide (scaled by the counter-steer assist).
 */
export function steerAngle(t: CarTuning, as: Assist, steerIn: number, u: number, v: number, authority: number, assistMul: number): number {
  const absU = Math.abs(u);
  const lock = lerp(1, t.minSteerScale * (1 - 0.3 * as.steer), smoothstep(5, t.steerFalloffSpeed, absU));
  const beta = Math.atan2(v, Math.max(absU, 3));
  const counter = t.driftAssist * as.counter * assistMul * smoothstep(3, 9, u) * (1 - Math.abs(steerIn));
  return steerIn * t.maxSteer * lock * authority + counter * clamp(beta, -0.6, 0.6);
}
