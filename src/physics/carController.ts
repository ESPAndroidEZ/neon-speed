import { clamp, lerp, smoothstep, wrapAngle } from '../core/math';
import type { CarInput, CarState, RaceTelemetry, Vec3, WeatherProfile } from '../types/game';
import type { CarTuning } from './carTuning';
import { Drivetrain } from './drivetrain';
import { tireLateral } from './tire';

const G = 9.81;
const DRIFT_ANGLE = 0.22; // rad of slip before it counts as a drift
const DRIFT_MIN_SPEED = 10; // m/s
const DRIFT_BANK_DELAY = 0.8; // s without drifting before the chain banks

export interface CarFlags {
  drifting: boolean;
  wheelspin: boolean;
  braking: boolean;
  handbrake: boolean;
}

/**
 * Arcade drift car. Pure maths, no rendering. Bicycle model in the car's local frame
 * (u forward, v left, r yaw rate) with saturating tyres, a friction circle on the rear
 * axle (throttle steals lateral grip -> power oversteer) and a handbrake that cuts rear grip.
 * Advance with step() at a fixed 1/60 s only.
 */
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
  /** Points in the drift chain currently being built. */
  driftChain = 0;
  /** Points banked from finished chains. */
  driftBank = 0;

  private readonly t: CarTuning;
  private u = 0;
  private v = 0;
  private r = 0;
  private hbFactor = 1;
  private chainTime = 0;
  private calmTime = 0;
  private prevX = 0;
  private prevZ = 0;
  private prevHeading = 0;

  constructor(tuning: CarTuning) {
    this.t = tuning;
    this.drivetrain = new Drivetrain(tuning);
  }

  reset(x = 0, z = 0, heading = 0): void {
    const s = this.state;
    s.position.x = x;
    s.position.z = z;
    s.heading = heading;
    this.prevX = x;
    this.prevZ = z;
    this.prevHeading = heading;
    this.u = this.v = this.r = 0;
    this.hbFactor = 1;
    this.driftChain = this.driftBank = this.chainTime = this.calmTime = 0;
    this.drivetrain.reset();
    this.publish();
  }

  step(dt: number, input: CarInput, weather: WeatherProfile): void {
    const t = this.t;
    const s = this.state;
    const dtn = this.drivetrain;
    this.prevX = s.position.x;
    this.prevZ = s.position.z;
    this.prevHeading = s.heading;
    dtn.update(dt, this.u, input.throttle, input.brake, input.nitro);

    const { u, v, r } = this;
    const g = weather.grip;
    const absU = Math.abs(u);
    const dir = u >= 0 ? 1 : -1;
    const wheelbase = t.cgToFront + t.cgToRear;
    const fzF = (t.mass * G * t.cgToRear) / wheelbase;
    const fzR = (t.mass * G * t.cgToFront) / wheelbase;
    const sf = smoothstep(0.2, 2.5, absU); // no tyre forces at a standstill
    const slipDen = Math.max(absU, 3);

    // Steering: less lock at speed, plus auto counter-steer when the stick is released mid-slide.
    const lock = lerp(1, t.minSteerScale, smoothstep(5, t.steerFalloffSpeed, absU));
    const beta = Math.atan2(v, slipDen);
    const assist = t.driftAssist * smoothstep(3, 9, u) * (1 - Math.abs(input.steer));
    const delta = input.steer * t.maxSteer * lock + assist * clamp(beta, -0.6, 0.6);

    // Handbrake bites quickly and lets go slowly, which is what makes catching a slide controllable.
    this.hbFactor = lerp(this.hbFactor, input.handbrake ? t.handbrakeGrip : 1, Math.min(1, dt * (input.handbrake ? 14 : 3)));

    // Rear axle: drive force is capped by traction, and what it uses is taken from sideways grip.
    const muR = t.gripRear * g * this.hbFactor;
    const tractionLimit = muR * fzR;
    const wanted = dtn.driveForce;
    const fxDrive = clamp(wanted, -tractionLimit, tractionLimit);
    const usage = Math.abs(fxDrive) / (tractionLimit + 1);
    const latScale = Math.max(0.45, Math.sqrt(Math.max(0, 1 - usage * usage * 0.72)));

    const alphaF = Math.atan2(v + t.cgToFront * r, slipDen) - dir * delta;
    const alphaR = Math.atan2(v - t.cgToRear * r, slipDen);
    const fyF = tireLateral(alphaF, fzF, t.gripFront * g, t.tireB, t.tireC) * sf;
    const fyR = tireLateral(alphaR, fzR, muR * latScale, t.tireB, t.tireC) * sf;
    const cd = Math.cos(delta);

    // Longitudinal: brakes (grip-limited, so rain/snow lengthen stopping), handbrake, drag, rolling.
    const motion = clamp(u, -1, 1);
    const brakeMax = Math.min(t.brakeForce, g * t.gripFront * t.mass * G);
    const fBrake = -dtn.brakeCmd * brakeMax * motion;
    const fHand = input.handbrake ? -Math.min(t.handbrakeForce, g * t.gripRear * fzR) * motion : 0;
    const fDrag = -t.dragCoef * u * absU;
    const fRoll = -t.rollingResistance * t.mass * G * clamp(u / 0.3, -1, 1);
    const fScrub = -fyF * Math.sin(delta);

    const du = (fxDrive + fBrake + fHand + fDrag + fRoll + fScrub) / t.mass + v * r;
    const dv = (fyF * cd + fyR) / t.mass - u * r;
    const dr = (t.cgToFront * fyF * cd - t.cgToRear * fyR - t.yawDamping * r) / t.inertia;
    this.u += du * dt;
    this.v += dv * dt;
    this.r += dr * dt;
    if (absU < 3 && !input.handbrake) this.v *= Math.exp(-5 * dt * (1 - sf));

    s.heading = wrapAngle(s.heading + this.r * dt);
    this.publish();
    s.position.x += s.velocity.x * dt;
    s.position.z += s.velocity.z * dt;

    this.flags.wheelspin = Math.abs(wanted) > tractionLimit * 1.02 && Math.abs(this.u) < 40;
    this.flags.braking = dtn.brakeCmd > 0.2 && absU > 2;
    this.flags.handbrake = input.handbrake;
    this.scoreDrift(dt);
  }

  /** Interpolated pose for rendering between fixed steps. Writes position, returns heading. */
  readPose(alpha: number, out: Vec3): number {
    const s = this.state;
    out.x = lerp(this.prevX, s.position.x, alpha);
    out.y = 0;
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
    out.drifting = this.flags.drifting;
    out.driftScore = Math.floor(this.driftChain);
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

  private scoreDrift(dt: number): void {
    const s = this.state;
    const speed = Math.abs(this.u);
    const slip = Math.abs(s.slipAngle);
    const drifting = speed > DRIFT_MIN_SPEED && slip > DRIFT_ANGLE;
    this.flags.drifting = drifting;
    if (drifting) {
      this.calmTime = 0;
      this.chainTime += dt;
      this.driftChain += speed * slip * dt * 10 * (1 + Math.min(this.chainTime, 10) * 0.2);
      this.drivetrain.addNitro(this.t.nitroDriftRefillPerSec * dt * Math.min(1, slip / 0.6));
    } else if (this.driftChain > 0 && (this.calmTime += dt) > DRIFT_BANK_DELAY) {
      this.driftBank += this.driftChain;
      this.driftChain = this.chainTime = 0;
    }
  }
}
