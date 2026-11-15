import { clamp, smoothstep } from '../../core/math';
import type { CarInput, WeatherProfile } from '../../types/game';
import type { PhysicsEnv } from '../weatherLevels';
import type { CarController } from '../carController';
import { axleCaps, CAP, diffCap, lateralCurve } from './v2Tyre';
import { carry, driveTrim, rearHold, steerV2, yawAssist } from './arcade';

const G = 9.81;
const DRIVE_USE = 0.95; // a spinning tyre still keeps a little sideways grip
const AWD_SHIFT = 0.3;
const ABS_USE = 0.92; // ABS cycles just under the peak
const EBD_REAR = 0.72; // with ABS the rear is held further below its limit (EBD), so it never slides first
const MU_LONG = 1.2; // friction ellipse: tyres give more grip along than across (traction and braking) // centre coupling moves up to 30 % of the front share rearward on power

/** Cornering stiffness grows slower than load: a more heavily loaded axle needs more slip angle (nose-heavy = understeer). */
const stiff = (fzAxle: number, nom: number): number => Math.sqrt(Math.max(0.5, (fzAxle * 0.5) / nom));

/**
 * Handling v2 (docs/handling-plan.md section 2): per-axle loads with roll-stiffness share, load-sensitive tyres with a
 * peak and fall-off, a friction ellipse per axle, diffs, brakes with lock-up, handbrake = rear locked, aero, AYC.
 * Characters come from these forces only (no per-layout hacks). One fixed step, no allocation, state = the v1 fields.
 */
export function stepV2(c: CarController, dt: number, input: CarInput, weather: WeatherProfile | PhysicsEnv): void {
  const t = c.t, p = c.v2, dtn = c.drivetrain, env = weather as Partial<PhysicsEnv>;
  c.thr = t.throttleLag > 0 ? c.thr + (input.throttle - c.thr) * Math.min(1, dt / t.throttleLag) : input.throttle;
  dtn.update(dt, c.u, c.thr, input.brake, input.nitro);
  const ld = c.load;
  ld.update(dt, t, c.axRaw, c.ayRaw); // smoothed body accelerations (ld.ax, ld.ay)
  const steerIn = clamp(input.steer * c.sensitivity, -1, 1);
  const u = c.u, v = c.v, r = c.r, absU = Math.abs(u);
  let g = weather.grip * c.surfaceGrip;
  if (weather.name === 'RAIN') g *= 1 - 0.25 * (env.intensity ?? 1) * smoothstep(28, 45, absU); // aquaplaning risk
  // 1. loads
  const m = p.mass, W = m * G, u2 = u * u;
  const fzF = clamp((W * p.b) / p.wb - (m * ld.ax * p.cg) / p.wb + p.clF * u2, 0.15 * W, 0.9 * W);
  const fzR = W + (p.clF + p.clR) * u2 - fzF;
  const roll = m * Math.abs(ld.ay) * p.cg;
  axleCaps(p.muF * g, fzF, (roll * p.rollF) / p.trackF, p.nomF, p.sens);
  const inF = CAP.inner, outF = CAP.outer, capF = CAP.total;
  const hold = rearHold(c, input.handbrake, g, dt);
  axleCaps(p.muR * g * (env.rearGripMul ?? 1) * hold, fzR, (roll * (1 - p.rollF)) / p.trackR, p.nomR, p.sens);
  const inR = CAP.inner, outR = CAP.outer, capR = CAP.total;
  // 2. steering and slip angles
  const slipDen = Math.max(absU, 3);
  const beta = Math.atan2(v, slipDen);
  const delta = steerV2(c, steerIn, beta, absU, env.assistMul ?? 1);
  const vyF = v + p.a * r, vyR = v - p.b * r;
  const alphaF = Math.atan2(vyF, slipDen) - (u >= 0 ? 1 : -1) * delta;
  const alphaR = Math.atan2(vyR, slipDen);
  // 3. drive through the diffs (engine braking on lift goes the same way)
  const eng = c.thr < 0.05 && dtn.gear > 0 && u > 1 ? -t.engineBraking * m * G * clamp(dtn.rpm / t.redlineRpm, 0, 1) * Math.min(1, g) : 0;
  const want = dtn.driveForce * driveTrim(c, beta, delta) + eng;
  const sF = p.layout === 0 ? 1 : p.layout === 1 ? 0 : p.awdFront * (1 - AWD_SHIFT * c.thr);
  const pre = p.preload / p.wheelR;
  const dcF = DRIVE_USE * MU_LONG * (p.layout === 0 ? diffCap(inF, outF, p.lock, pre) : diffCap(inF, outF, 0.4, 0));
  const dcR = DRIVE_USE * MU_LONG * diffCap(inR, outR, p.lock, pre);
  let wF = want * sF, wR = want - wF;
  if (p.layout === 2) { // centre coupling: what one axle cannot use goes to the other
    const sg = Math.sign(want);
    const overF = Math.max(0, Math.abs(wF) - dcF), overR = Math.max(0, Math.abs(wR) - dcR);
    wF += sg * Math.min(overR, Math.max(0, dcF - Math.abs(wF)));
    wR += sg * Math.min(overF, Math.max(0, dcR - Math.abs(wR)));
  }
  p.spin = Math.abs(wF) > dcF * 1.02 || Math.abs(wR) > dcR * 1.02;
  const dF = clamp(wF, -dcF, dcF), dR = clamp(wR, -dcR, dcR);
  p.split = Math.abs(dF) + Math.abs(dR) > 1 ? Math.abs(dF) / (Math.abs(dF) + Math.abs(dR)) : sF;
  // 4. brakes: ABS (assist LIGHT/FULL) holds each axle at its limit; OFF lets an overloaded axle lock
  const motion = clamp(u, -1, 1);
  const abs = c.stability !== 'OFF';
  const bk = dtn.brakeCmd * p.brakeMax;
  let bF = bk * p.bias, bR = bk * (1 - p.bias);
  const lxF = capF * MU_LONG, lxR = capR * MU_LONG;
  p.lockedF = !abs && bF > lxF && absU > 2;
  p.lockedR = (input.handbrake && absU > 0.5) || (!abs && bR > lxR && absU > 2);
  bF = Math.min(bF, lxF * (abs ? ABS_USE : 1) - (abs ? Math.max(0, -dF) : 0)); // ABS counts engine braking in too
  bR = Math.min(bR, lxR * (abs ? EBD_REAR : 1) - (abs ? Math.max(0, -dR) : 0));
  bF = Math.max(0, bF);
  bR = Math.max(0, bR);
  const sf = smoothstep(0.2, 2.5, absU); // no tyre side forces at a standstill
  // 5. per-axle forces: friction ellipse (longitudinal first, lateral gets the rest)
  let bxF: number, byF: number, fxR: number, fyR: number;
  if (p.lockedF) {
    const sp = Math.hypot(u, vyF) + 0.01;
    bxF = (-p.slideF * capF * u) / sp;
    byF = (-p.slideF * capF * vyF) / sp;
  } else {
    const fx = clamp(dF - bF * motion, -lxF, lxF);
    const lat = capF * Math.sqrt(Math.max(0, 1 - (fx / lxF) * (fx / lxF)));
    const sat = 1 - 0.12 * smoothstep(p.pkF, 2.5 * p.pkF, Math.abs(alphaF)); // self-aligning torque past the peak
    let fy = lat * lateralCurve(alphaF / stiff(fzF, p.nomF), p.bF, p.cF) * sf * sat;
    const cs = Math.cos(delta), sn = Math.sin(delta);
    const capV = ((fzF / G) * Math.abs(vyF * cs - u * sn)) / dt + 4000; // never overshoot at walking pace
    fy = clamp(fy, -capV, capV);
    bxF = fx * cs - fy * sn;
    byF = fy * cs + fx * sn;
  }
  if (p.lockedR) {
    const sp = Math.hypot(u, vyR) + 0.01;
    fxR = (-p.slideR * capR * u) / sp;
    fyR = (-p.slideR * capR * vyR) / sp;
  } else {
    fxR = clamp(dR - bR * motion, -lxR, lxR);
    const lat = capR * Math.sqrt(Math.max(0, 1 - (fxR / lxR) * (fxR / lxR)));
    const capV = ((fzR / G) * Math.abs(vyR)) / dt + 4000;
    fyR = clamp(lat * lateralCurve(alphaR / stiff(fzR, p.nomR), p.bR, p.cR) * sf, -capV, capV);
  }
  // 6. aero, rolling, active yaw control (toward the steer, scaled by steer and throttle)
  const drag = -p.cdA * u * absU;
  const rolling = -t.rollingResistance * W * clamp(u / 0.3, -1, 1) - c.surfaceDrag * m * u;
  const ayc = p.ayc * steerIn * (0.4 + 0.6 * c.thr) * p.a * capF * smoothstep(3, 10, absU);
  c.axRaw = (bxF + fxR + drag + rolling) / m;
  c.ayRaw = (byF + fyR) / m;
  const speed = Math.hypot(u, v);
  const dr = (p.a * byF - p.b * fyR + ayc) / p.inertia + yawAssist(c, Math.atan2(v, Math.max(absU, 0.5)), speed, input.handbrake);
  c.u += (c.axRaw + v * r) * dt;
  c.v += (c.ayRaw - u * r) * dt;
  c.r += dr * dt;
  carry(c, g, dt);
  if (absU < 3 && !input.handbrake) c.v *= Math.exp(-5 * dt * (1 - sf));
  // telemetry and flags
  p.fzF = fzF; p.fzR = fzR; p.alphaF = alphaF; p.alphaR = alphaR; p.delta = delta;
  p.useF = Math.hypot(bxF / (capF * MU_LONG + 1), byF / (capF + 1)); // share of the friction ellipse in use
  p.useR = Math.hypot(fxR / (capR * MU_LONG + 1), fyR / (capR + 1));
  c.flags.wheelspin = p.spin && Math.abs(c.u) < 40;
  c.flags.braking = dtn.brakeCmd > 0.2 && absU > 2;
}
