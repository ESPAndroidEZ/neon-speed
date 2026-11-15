import { clamp, lerp, smoothstep, wrapAngle } from '../core/math';
import type { CarInput, CarState, RaceTelemetry, Vec3, WeatherProfile } from '../types/game';
import type { PhysicsEnv } from './weatherLevels';
import type { CarTuning } from './carTuning';
import { DriftScorer } from './driftScorer';
import { Drivetrain } from './drivetrain';
import { tireLateral } from './tire';
import { restoreCar, snapshotCar } from './carSnapshot';
import { steerAngle } from './steering';
import { LoadTransfer } from './loadTransfer';
import { driftHoldTarget, handbrakeCarry, slideDamping, slideYaw } from './stability';
import { createAssist, type Assist } from './assists';

const G = 9.81;
const TRACTION_SQUAT = 0.15; // share of the rear load gained under acceleration that helps traction (keeps launches as tuned)

export interface CarFlags {
  drifting: boolean;
  wheelspin: boolean;
  braking: boolean;
  handbrake: boolean;
}

/** Arcade car, pure maths: bicycle model (u forward, v left, r yaw) with weight transfer, friction circles and a handbrake. step() at 1/60 s only. */
export class CarController {
  readonly state: CarState = {
    position: { x: 0, y: 0, z: 0 },
    heading: 0,
    velocity: { x: 0, y: 0, z: 0 },
    speed: 0,
    yawRate: 0,
    slipAngle: 0,
  };
  readonly flags: CarFlags = { drifting: false, wheelspin: false, braking: false, handbrake: false };
  readonly drivetrain: Drivetrain;
  readonly drift = new DriftScorer();
  /** Set by the world each step: tyre grip multiplier (verge/grass < 1) and extra drag (1/s). */
  surfaceGrip = 1;
  surfaceDrag = 0;
  /** 0..1 front-tyre steering authority (hydroplaning in puddles). */
  steerAuthority = 1;
  /** Driving assists and steering sensitivity (player settings; the AI keeps STANDARD and 1). */
  readonly assist: Assist = createAssist();
  sensitivity = 1;
  readonly load = new LoadTransfer();
  /** Last step's body accelerations (m/s^2) and the lagged throttle, for the next step's weight transfer. */
  axRaw = 0;
  ayRaw = 0;
  thr = 0;

  readonly t: CarTuning;
  u = 0;
  v = 0;
  r = 0;
  hbFactor = 1;
  prevX = 0;
  prevZ = 0;
  prevHeading = 0;

  constructor(tuning: CarTuning) {
    this.t = tuning;
    this.drivetrain = new Drivetrain(tuning);
  }

  snapshot(): unknown {
    return snapshotCar(this);
  }

  restore(d: unknown): void {
    restoreCar(this, d as ReturnType<typeof snapshotCar>);
    this.load.update(0, this.t, this.load.ax, this.load.ay);
    this.publish();
  }

  reset(x = 0, z = 0, heading = 0): void {
    const s = this.state;
    s.position.x = x;
    s.position.z = z;
    s.heading = heading;
    [this.prevX, this.prevZ, this.prevHeading] = [x, z, heading];
    this.u = this.v = this.r = 0;
    this.hbFactor = 1;
    this.drift.reset();
    this.surfaceGrip = 1;
    this.surfaceDrag = 0;
    this.steerAuthority = 1;
    this.axRaw = this.ayRaw = this.thr = 0;
    this.load.reset(this.t);
    this.drivetrain.reset();
    this.publish();
  }
  step(dt: number, input: CarInput, weather: WeatherProfile | PhysicsEnv): void {
    const t = this.t;
    const s = this.state;
    const dtn = this.drivetrain;
    this.prevX = s.position.x;
    this.prevZ = s.position.z;
    this.prevHeading = s.heading;
    const as = this.assist;
    this.thr = t.throttleLag > 0 ? this.thr + (input.throttle - this.thr) * Math.min(1, dt / t.throttleLag) : input.throttle;
    dtn.update(dt, this.u, this.thr, input.brake, input.nitro);
    const ld = this.load;
    ld.update(dt, t, this.axRaw, this.ayRaw);
    const steerIn = clamp(input.steer * this.sensitivity, -1, 1);
    const { u, v, r } = this;
    const g = weather.grip * this.surfaceGrip;
    const env = weather as Partial<PhysicsEnv>;
    const yawMul = (env.yawDampMul ?? 1) * (1 + 0.4 * as.steer) * slideDamping(t, u, v, dtn.brakeCmd, this.hbFactor);
    const assistMul = env.assistMul ?? 1;
    const rearMul = env.rearGripMul ?? 1;
    const absU = Math.abs(u);
    const { fzF, fzR } = ld;
    const sf = smoothstep(0.2, 2.5, absU); // no tyre forces at a standstill
    const slipDen = Math.max(absU, 3);
    const delta = steerAngle(t, as, steerIn, u, v, this.steerAuthority, assistMul);
    // Handbrake bites quickly and lets go slowly, which is what makes catching a slide controllable.
    this.hbFactor = lerp(this.hbFactor, input.handbrake ? t.handbrakeGrip : driftHoldTarget(t, u, v, this.thr, this.hbFactor), Math.min(1, dt * (input.handbrake ? 14 : 3)));

    // Rear axle: drive force is capped by traction, and what it uses is taken from sideways grip.
    const muR = t.gripRear * g * this.hbFactor * rearMul;
    const tractionLimit = muR * (ld.staticR + (fzR - ld.staticR) * TRACTION_SQUAT);
    const wanted = dtn.driveForce;
    // Lifting off: engine braking drags the rear axle too (lift-off oversteer on a loose car).
    const eng = this.thr < 0.05 && dtn.gear > 0 && u > 1 ? -t.engineBraking * t.mass * G * clamp(dtn.rpm / t.redlineRpm, 0, 1) * Math.min(1, g) : 0;
    const fxDrive = clamp(wanted + eng, -tractionLimit, tractionLimit);
    // Braking uses grip too: what the brakes use is taken from sideways grip.
    const bk = dtn.brakeCmd * t.brakeForce * (u > 0.5 ? 1 : 0);
    const useF = (bk * t.brakeBias * (1 - 0.45 * as.brake)) / (t.gripFront * fzF);
    const useBR = (bk * (1 - t.brakeBias)) / (t.gripRear * fzR);
    const usage = Math.max(Math.abs(fxDrive) / (tractionLimit + 1), useBR);
    const latScale = Math.max(t.powerFloor, Math.sqrt(Math.max(0, 1 - usage * usage * t.powerSlide)));
    const latScaleF = Math.max(0.5, Math.sqrt(Math.max(0, 1 - useF * useF * 0.55)));
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
    const fRoll = -t.rollingResistance * t.mass * G * clamp(u / 0.3, -1, 1) - this.surfaceDrag * t.mass * u;
    const fScrub = -fyF * Math.sin(delta);
    this.axRaw = (fxDrive + fBrake + fHand + fDrag + fRoll + fScrub) / t.mass;
    this.ayRaw = (fyF * cd + fyR) / t.mass;
    const du = this.axRaw + v * r;
    const dv = this.ayRaw - u * r;
    const dr = (t.cgToFront * fyF * cd - t.cgToRear * fyR - t.yawDamping * yawMul * r) / t.inertia + slideYaw(t, u, v, this.hbFactor);
    this.u += du * dt;
    this.v += dv * dt;
    this.r += dr * dt;
    const cy = handbrakeCarry(t, this.u, this.v, this.hbFactor, g, dt), u1 = this.u; // swings velocity toward the nose
    if (cy !== 0) { const c = Math.cos(cy), sn = Math.sin(cy); this.u = u1 * c - this.v * sn; this.v = u1 * sn + this.v * c; }
    if (absU < 3 && !input.handbrake) this.v *= Math.exp(-5 * dt * (1 - sf));
    s.heading = wrapAngle(s.heading + this.r * dt);
    this.publish();
    s.position.x += s.velocity.x * dt;
    s.position.z += s.velocity.z * dt;

    this.flags.wheelspin = Math.abs(wanted) > tractionLimit * 1.02 && Math.abs(this.u) < 40;
    this.flags.braking = dtn.brakeCmd > 0.2 && absU > 2;
    this.flags.handbrake = input.handbrake;
    this.flags.drifting = this.drift.drifting;
    this.drift.update(dt, absU, s.slipAngle, dtn, t.nitroDriftRefillPerSec);
  }

  /** Interpolated pose for rendering between fixed steps. Writes position, returns heading. */
  readPose(alpha: number, out: Vec3): number {
    const s = this.state;
    out.x = lerp(this.prevX, s.position.x, alpha);
    out.y = s.position.y;
    out.z = lerp(this.prevZ, s.position.z, alpha);
    return this.prevHeading + wrapAngle(s.heading - this.prevHeading) * alpha;
  }

  /** Fills the fields this module owns; the race manager owns lap, position and raceTime. */
  fillTelemetry(out: RaceTelemetry): void {
    const d = this.drivetrain;
    out.speedKph = Math.abs(this.u) * 3.6;
    out.rpm = d.rpm;
    out.redlineRpm = this.t.redlineRpm;
    out.gear = d.gear;
    out.nitroLevel = d.nitroLevel;
    out.nitroActive = d.nitroActive;
    out.drifting = this.drift.drifting;
    out.driftScore = Math.floor(this.drift.chain);
  }

  /** Collision response: move by (dx,dz), add a world-space velocity change and a yaw-rate change. */
  nudge(dx: number, dz: number, dvx: number, dvz: number, dr: number): void {
    const s = this.state;
    const sh = Math.sin(s.heading);
    const ch = Math.cos(s.heading);
    s.position.x += dx;
    s.position.z += dz;
    this.u += dvx * sh + dvz * ch;
    this.v += dvx * ch - dvz * sh;
    this.r += dr;
    this.publish();
  }

  /** Local-frame lateral acceleration in m/s^2 (for body roll and camera effects). */
  get lateralAccel(): number {
    return this.r * this.u;
  }

  private publish(): void {
    const s = this.state;
    const sh = Math.sin(s.heading);
    const ch = Math.cos(s.heading);
    s.velocity.x = this.u * sh + this.v * ch;
    s.velocity.z = this.u * ch - this.v * sh;
    s.speed = this.u;
    s.yawRate = this.r;
    s.slipAngle = Math.abs(this.u) > 1 ? Math.atan2(this.v, Math.abs(this.u)) * Math.sign(this.u) : 0;
  }
}
