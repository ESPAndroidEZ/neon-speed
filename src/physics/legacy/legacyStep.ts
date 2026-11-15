import { clamp, lerp, smoothstep } from '../../core/math';
import type { CarInput, WeatherProfile } from '../../types/game';
import type { PhysicsEnv } from '../weatherLevels';
import type { CarController } from '../carController';
import { tireLateral } from './tire';
import { steerAngle } from './steering';
import { splitDrive } from './driveSplit';
import { driftHoldTarget, handbrakeCarry, slideDamping, slideYaw } from './stability';

const G = 9.81;
const TRACTION_SQUAT = 0.15; // share of the rear load gained under acceleration that helps traction (keeps launches as tuned)

/**
 * Handling v1 (git tag handling-v1), kept verbatim as the `legacy` model: arcade bicycle model with weight transfer,
 * friction circles and the handbrake carry / drift hold. Advances u, v, r one fixed step and sets the wheelspin and
 * braking flags; the controller integrates heading and position.
 */
export function stepLegacy(c: CarController, dt: number, input: CarInput, weather: WeatherProfile | PhysicsEnv): void {
  const t = c.t;
  const dtn = c.drivetrain;
  const as = c.assist;
  c.thr = t.throttleLag > 0 ? c.thr + (input.throttle - c.thr) * Math.min(1, dt / t.throttleLag) : input.throttle;
  dtn.update(dt, c.u, c.thr, input.brake, input.nitro);
  const ld = c.load;
  ld.update(dt, t, c.axRaw, c.ayRaw);
  const steerIn = clamp(input.steer * c.sensitivity, -1, 1);
  const { u, v, r } = c;
  const g = weather.grip * c.surfaceGrip;
  const env = weather as Partial<PhysicsEnv>;
  const yawMul = (env.yawDampMul ?? 1) * (1 + 0.4 * as.steer) * slideDamping(t, u, v, dtn.brakeCmd, c.hbFactor);
  const assistMul = env.assistMul ?? 1;
  const rearMul = env.rearGripMul ?? 1;
  const absU = Math.abs(u);
  const { fzF, fzR } = ld;
  const sf = smoothstep(0.2, 2.5, absU); // no tyre forces at a standstill
  const slipDen = Math.max(absU, 3);
  const delta = steerAngle(t, as, steerIn, u, v, c.steerAuthority, assistMul);
  // Handbrake bites quickly and lets go slowly, which is what makes catching a slide controllable.
  c.hbFactor = lerp(c.hbFactor, input.handbrake ? t.handbrakeGrip : driftHoldTarget(t, u, v, c.thr, c.hbFactor, g), Math.min(1, dt * (input.handbrake ? 14 : 3)));

  const muR = t.gripRear * g * c.hbFactor * rearMul; // drive is split by layout (driveSplit), each axle capped by its traction
  const tractionLimit = muR * (ld.staticR + (fzR - ld.staticR) * TRACTION_SQUAT);
  const wanted = dtn.driveForce;
  // Lifting off: engine braking drags the rear axle too (lift-off oversteer on a loose car).
  const eng = c.thr < 0.05 && dtn.gear > 0 && u > 1 ? -t.engineBraking * t.mass * G * clamp(dtn.rpm / t.redlineRpm, 0, 1) * Math.min(1, g) : 0;
  const ds = splitDrive(t, wanted + eng, t.gripFront * g * ld.gripF * fzF, tractionLimit, c.drv), fFwd = ds.fxF * Math.sin(delta);
  // Braking uses grip too: what the brakes use is taken from sideways grip.
  const bk = dtn.brakeCmd * t.brakeForce * (u > 0.5 ? 1 : 0);
  const useF = (bk * t.brakeBias * (1 - 0.45 * as.brake)) / (t.gripFront * fzF);
  const useBR = (bk * (1 - t.brakeBias)) / (t.gripRear * fzR);
  const usage = Math.max(ds.useR, useBR);
  const latScale = Math.max(t.powerFloor, Math.sqrt(Math.max(0, 1 - usage * usage * t.powerSlide)));
  const latScaleF = Math.max(0.5, Math.sqrt(Math.max(0, 1 - useF * useF * 0.55 - ds.useF * ds.useF * (1 - 0.75 * smoothstep(2, 8, absU))))); // braking and FWD drive cost front grip
  const alphaF = Math.atan2(v + t.cgToFront * r, slipDen) - (u >= 0 ? 1 : -1) * delta;
  const alphaR = Math.atan2(v - t.cgToRear * r, slipDen);
  const fyF = tireLateral(alphaF, fzF, t.gripFront * g * ld.gripF * latScaleF, t.tireB, t.tireC) * sf;
  const fyR = tireLateral(alphaR, fzR, muR * latScale * ld.gripR, t.tireB, t.tireC) * sf;
  const cd = Math.cos(delta);
  // Longitudinal: brakes (grip-limited, so rain/snow lengthen stopping), handbrake, drag, rolling.
  const motion = clamp(u, -1, 1);
  const brakeMax = t.brakeForce * g;
  const fBrake = -dtn.brakeCmd * brakeMax * motion;
  const fHand = input.handbrake ? -Math.min(t.handbrakeForce, g * t.gripRear * fzR) * motion : 0;
  const fDrag = -t.dragCoef * u * absU;
  const fRoll = -t.rollingResistance * t.mass * G * clamp(u / 0.3, -1, 1) - c.surfaceDrag * t.mass * u;
  const fScrub = -fyF * Math.sin(delta);
  c.axRaw = (ds.fxR + ds.fxF * cd + fBrake + fHand + fDrag + fRoll + fScrub) / t.mass;
  c.ayRaw = (fyF * cd + fyR + fFwd) / t.mass; // FWD: the steered wheels pull the nose into the turn
  const du = c.axRaw + v * r;
  const dv = c.ayRaw - u * r;
  const dr = (t.cgToFront * (fyF * cd + fFwd) - t.cgToRear * fyR - t.yawDamping * yawMul * r) / t.inertia + slideYaw(t, u, v, c.hbFactor);
  c.u += du * dt;
  c.v += dv * dt;
  c.r += dr * dt;
  const cy = handbrakeCarry(t, c.u, c.v, c.hbFactor, g, dt), u1 = c.u; // swings velocity toward the nose
  if (cy !== 0) { const cc = Math.cos(cy), sn = Math.sin(cy); c.u = u1 * cc - c.v * sn; c.v = u1 * sn + c.v * cc; }
  if (absU < 3 && !input.handbrake) c.v *= Math.exp(-5 * dt * (1 - sf));
  c.flags.wheelspin = ds.spin && Math.abs(c.u) < 40;
  c.flags.braking = dtn.brakeCmd > 0.2 && absU > 2;
}
