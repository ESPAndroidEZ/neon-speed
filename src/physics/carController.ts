import { lerp, wrapAngle } from '../core/math';
import type { CarInput, CarState, RaceTelemetry, Vec3, WeatherProfile } from '../types/game';
import type { PhysicsEnv } from './weatherLevels';
import type { CarTuning } from './carTuning';
import { DriftScorer } from './driftScorer';
import { Drivetrain } from './drivetrain';
import { restoreCar, snapshotCar } from './carSnapshot';
import { LoadTransfer } from './legacy/loadTransfer';
import { createDriveOut } from './legacy/driveSplit';
import { stepLegacy } from './legacy/legacyStep';
import { createAssist, HANDLING, type Assist, type StabilityLevel } from './assists';
import { buildV2, createV2, type V2Car } from './v2/v2Params';
import { stepV2 } from './v2/v2Step';

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
  readonly drv = createDriveOut();
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
  /** v2 arcade layer level (player setting; the AI keeps LIGHT). */
  stability: StabilityLevel = 'LIGHT';
  /** v2 model: parameters derived from the car's real spec, and the last step's telemetry (debug overlay). */
  readonly v2: V2Car;
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
    this.v2 = createV2(tuning);
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
    buildV2(this.t, this.v2);
    this.drivetrain.reset();
    this.publish();
  }
  /** One fixed 1/60 s step with the model chosen in HANDLING (global, so every car in a race uses the same one). */
  step(dt: number, input: CarInput, weather: WeatherProfile | PhysicsEnv): void {
    const s = this.state;
    this.prevX = s.position.x;
    this.prevZ = s.position.z;
    this.prevHeading = s.heading;
    const absU = Math.abs(this.u); // speed at the start of the step (the drift scorer reads it)
    if (HANDLING.model === 'v2') stepV2(this, dt, input, weather);
    else stepLegacy(this, dt, input, weather);
    s.heading = wrapAngle(s.heading + this.r * dt);
    this.publish();
    s.position.x += s.velocity.x * dt;
    s.position.z += s.velocity.z * dt;
    this.flags.handbrake = input.handbrake;
    this.flags.drifting = this.drift.drifting;
    this.drift.update(dt, absU, s.slipAngle, this.drivetrain, this.t.nitroDriftRefillPerSec);
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

  /** Peak tyre friction the active model gives this car (drivers and bots plan corner speeds with it). */
  get gripEstimate(): number {
    return HANDLING.model === 'v2' ? Math.min(this.v2.muF, this.v2.muR) : Math.min(this.t.gripFront, this.t.gripRear);
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
