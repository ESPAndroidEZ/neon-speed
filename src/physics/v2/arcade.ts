import { clamp, lerp, smoothstep } from '../../core/math';
import type { CarController } from '../carController';
import { driftHoldTarget, handbrakeCarry } from '../legacy/stability';

/*
 * v2 arcade layer (plan section 4), on top of the physics and never inside the force code. Setting: OFF / LIGHT / FULL.
 * OFF: raw physics. LIGHT (default): counter-steer help when the stick is released mid-slide, and a yaw limiter that only
 * acts past the slip angle a skilled driver would hold. FULL: stronger help, an earlier limiter and the v1 handbrake
 * carry and drift hold. Pure arithmetic, no allocation.
 */
const G = 9.81;
const LIMIT = { OFF: 9, LIGHT: 0.36, FULL: 0.3 };
const GAIN = { OFF: 0, LIGHT: 14, FULL: 16 };
const COUNTER = { OFF: 0, LIGHT: 1, FULL: 1.4 };

/** Front wheel angle (rad): speed-sensitive lock (full stick just past the front tyre peak at speed) + counter-steer help. */
export function steerV2(c: CarController, steerIn: number, beta: number, absU: number, assistMul: number): number {
  const p = c.v2, t = c.t;
  const park = 1 + t.parkSteer * (1 - smoothstep(2, 9, absU));
  const v2 = Math.max(absU, 1) * Math.max(absU, 1);
  const atSpeed = (1.15 * p.wb * G * p.muF) / v2 + 1.25 * p.pkF * (1 - 0.15 * c.assist.steer);
  // counter-steering into a slide may go past the grip range by the slide angle (a driver winds on more lock there)
  const lock = Math.min(t.maxSteer * park, atSpeed + (steerIn * beta > 0 ? Math.min(0.6, Math.abs(beta)) : 0));
  const counter = t.driftAssist * c.assist.counter * COUNTER[c.stability] * assistMul * smoothstep(3, 9, c.u) * (1 - Math.abs(steerIn));
  return steerIn * lock * c.steerAuthority + counter * clamp(beta, -0.6, 0.6);
}

/** Drive multiplier 0..1: the limiter also trims engine torque while the tail is swinging out past the level's angle (ESC-like). */
export function driveTrim(c: CarController, beta: number, delta: number): number {
  const lim = LIMIT[c.stability];
  if (GAIN[c.stability] <= 0 || c.u < 1.2) return 1;
  const slide = beta * c.r < 0 ? smoothstep(lim - 0.2, lim + 0.05, Math.abs(beta)) : 0; // tail outside the turn
  const e = c.r - (c.u * Math.tan(delta)) / c.v2.wb; // yaw rate beyond what the front wheels ask for (slow-speed pirouettes)
  const yaw = e * c.r > 0 ? smoothstep(0.15, 0.5, Math.abs(e)) : 0;
  return 1 - 0.85 * Math.max(slide, yaw) * smoothstep(1.2, 3.5, c.u); // never at a crawl: it must still pull out of a snow bank
}

/** Yaw acceleration (rad/s^2) of the limiter: restores past the level's slip angle and damps the spin rate there. */
export function yawAssist(c: CarController, beta: number, speed: number, handbrake: boolean): number {
  const lv = c.stability;
  const extra = lv === 'FULL' && (handbrake || c.hbFactor < 0.985) ? 0.3 : 0;
  const over = Math.abs(beta) - LIMIT[lv] - extra;
  if (GAIN[lv] <= 0 || speed < 1 || over <= 0) { c.v2.assist = 0; return 0; }
  const k = smoothstep(1, 5, speed);
  c.v2.assist = Math.min(1, over / 0.3) * k;
  return (Math.sign(beta) * GAIN[lv] * Math.min(over, 0.7) - c.r * 4 * Math.min(1, over / 0.2)) * k;
}

/**
 * Rear grip multiplier after the handbrake (FULL only: v1 drift hold, throttle keeps the rear loose in a slide).
 * Updates `c.hbFactor` (already saved state). OFF and LIGHT: 1 (the handbrake itself locks the rear in the step).
 */
export function rearHold(c: CarController, handbrake: boolean, grip: number, dt: number): number {
  const t = c.t;
  const target = handbrake ? t.handbrakeGrip : c.stability === 'FULL' ? driftHoldTarget(t, c.u, c.v, c.thr, c.hbFactor, grip) : 1;
  c.hbFactor = lerp(c.hbFactor, target, Math.min(1, dt * (handbrake ? 14 : 3)));
  return c.stability === 'FULL' && !handbrake ? c.hbFactor : 1;
}

/** FULL only: v1 handbrake momentum carry, swings (u, v) toward the nose. Call after integrating. */
export function carry(c: CarController, grip: number, dt: number): void {
  if (c.stability !== 'FULL') return;
  const cy = handbrakeCarry(c.t, c.u, c.v, c.hbFactor, grip, dt);
  if (cy === 0) return;
  const cc = Math.cos(cy), sn = Math.sin(cy), u = c.u;
  c.u = u * cc - c.v * sn;
  c.v = u * sn + c.v * cc;
}
