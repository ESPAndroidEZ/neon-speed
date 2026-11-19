import { clamp, smoothstep } from '../core/math';
import { EV_BACKFIRE, EV_CUT, EV_DOWNSHIFT, EV_LIFT, EV_UPSHIFT, EventChannel } from './driveEvents';
import { GEAR_RATIOS, gearRatio, REVERSE_RATIO, type CarTuning } from './carTuning';

const RAD_S_TO_RPM = 60 / (2 * Math.PI);
const MAX_REVERSE_SPEED = 9;

/** Engine, automatic 6-speed gearbox, reverse and nitro. Outputs one drive force at the wheels. */
export class Drivetrain {
  /** -1 reverse, 1..6 forward. */
  gear = 1;
  rpm: number;
  nitroLevel = 1;
  nitroActive = false;
  /** Signed force at the rear wheels from the last update (N, + = forward). */
  driveForce = 0;
  /** 0..1 service-brake demand from the last update (accounts for reverse). */
  brakeCmd = 0;
  /** Turbo boost 0..1 (always 0 for naturally aspirated cars). */
  boost = 0;
  readonly events = new EventChannel();
  shiftTimer = 0;
  /** Manual gearbox (player only): the driver shifts with shiftUp / shiftDown, nothing shifts by itself. */
  manual = false;
  shiftUp = false;
  shiftDown = false;
  private lastUp = false;
  private lastDown = false;
  lastPedal = 0;
  wasCut = false;
  popClock = 0;
  private readonly t: CarTuning;

  constructor(t: CarTuning) {
    this.t = t;
    this.rpm = t.idleRpm;
  }

  snapshot(): unknown {
    return { gear: this.gear, rpm: this.rpm, nitroLevel: this.nitroLevel, nitroActive: this.nitroActive, driveForce: this.driveForce, brakeCmd: this.brakeCmd, boost: this.boost, shiftTimer: this.shiftTimer, lastPedal: this.lastPedal, wasCut: this.wasCut, popClock: this.popClock };
  }

  restore(d: unknown): void {
    Object.assign(this, d as object);
    this.events.clear();
  }

  reset(): void {
    this.gear = 1;
    this.rpm = this.t.idleRpm;
    this.nitroLevel = 1;
    this.nitroActive = false;
    this.driveForce = 0;
    this.brakeCmd = 0;
    this.shiftTimer = 0;
    this.boost = 0;
    this.lastPedal = 0;
    this.wasCut = false;
    this.events.clear();
  }

  /** One gear up or down: shift time (half for a downshift) and the sound events. */
  private shift(up: boolean): void {
    const t = this.t;
    if (up) {
      this.gear++;
      this.shiftTimer = t.shiftTime;
      this.events.push(EV_UPSHIFT, this.boost);
      if (this.rpm > t.redlineRpm * 0.7) this.events.push(EV_BACKFIRE, 0.4 + 0.5 * this.boost);
    } else {
      this.gear--;
      this.shiftTimer = t.shiftTime * 0.5;
      this.events.push(EV_DOWNSHIFT, 0);
    }
  }

  /** u = signed forward speed (m/s). */
  update(dt: number, u: number, throttle: number, brake: number, nitroKey: boolean): void {
    const t = this.t;
    // Holding brake at a standstill engages reverse; throttle from reverse goes forward again. Gas wins over a brake that is
    // still held (a finger or trigger resting on it), otherwise gas would silently act as the brake and the car would not go.
    if (this.gear > 0 && u < 0.6 && brake > 0.1 && throttle < 0.05) this.gear = -1;
    else if (this.gear < 0 && u > -0.6 && throttle > 0.1) this.gear = 1;
    const reversing = this.gear < 0;
    const pedal = reversing ? brake : throttle;
    this.brakeCmd = reversing ? throttle : brake;
    if (!reversing && throttle > 0.1) this.brakeCmd *= smoothstep(3, 6, Math.abs(u)); // pulling away with a brake still held: gas wins below ~11 km/h

    const ratio = (reversing ? REVERSE_RATIO : gearRatio(t, this.gear)) * t.finalDrive;
    const wheelRpm = (Math.abs(u) / t.wheelRadius) * ratio * RAD_S_TO_RPM;
    const target = Math.max(wheelRpm, t.idleRpm + (pedal > 0.05 ? pedal * 3000 : 0));
    this.rpm += (target - this.rpm) * Math.min(1, dt * 12);

    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    const up = this.shiftUp && !this.lastUp, down = this.shiftDown && !this.lastDown; // one shift per press
    this.lastUp = this.shiftUp;
    this.lastDown = this.shiftDown;
    if (this.manual && this.gear > 1 && Math.abs(u) < 2) this.gear = 1; // coming to a stop drops to first (no stalling in a high gear)
    if (this.gear > 0 && this.shiftTimer === 0) {
      if (this.manual) {
        if (up && this.gear < GEAR_RATIOS.length) this.shift(true);
        else if (down && this.gear > 1) this.shift(false);
      } else if (this.rpm > t.redlineRpm * t.upshiftFrac && this.gear < GEAR_RATIOS.length && pedal > 0.15) this.shift(true);
      else if ((pedal > 0.05 ? wheelRpm : this.rpm) < t.redlineRpm * t.downshiftFrac && this.gear > 1) this.shift(false); // on the gas the engine rpm is floored (idle + 3000), so kick down on the real wheel rpm, or a slowing car stays lugging
    }

    const wantNitro = nitroKey && this.nitroLevel > 0.01 && pedal > 0.1 && !reversing;
    this.nitroActive = wantNitro;
    if (wantNitro) this.nitroLevel = Math.max(0, this.nitroLevel - t.nitroBurnPerSec * dt);

    // Turbo: boost builds with throttle x rpm after a lag and drops quickly when the pedal lifts or the shift cuts power.
    if (t.turboTorque > 0) {
      const want = this.shiftTimer > 0 ? 0 : pedal * smoothstep(t.turboRpm, t.turboRpm + 1800, this.rpm);
      const tc = want > this.boost ? t.turboLag : 0.22;
      this.boost = clamp(this.boost + ((want - this.boost) * dt) / tc, 0, 1);
      if (this.lastPedal > 0.6 && pedal < 0.25 && this.boost > 0.2 && this.shiftTimer <= 0) this.events.push(EV_LIFT, this.boost);
    } else if (this.lastPedal > 0.6 && pedal < 0.2) this.events.push(EV_LIFT, 0);
    this.lastPedal = pedal;
    // deceleration burble: small pops while coasting at high rpm
    if (pedal < 0.05 && this.rpm > t.redlineRpm * 0.55 && Math.abs(u) > 8) {
      this.popClock += dt;
      if (this.popClock > 0.13) {
        this.popClock = 0;
        this.events.push(EV_BACKFIRE, 0.25);
      }
    }
    const x = (this.rpm - t.peakRpm) / t.torqueWidth;
    let torque = t.engineTorque * Math.max(0.3, 1 - x * x) * pedal;
    if (wantNitro) torque *= t.nitroTorqueMul;
    torque *= 1 + t.turboTorque * this.boost;
    const limiter = this.rpm >= t.redlineRpm;
    if (limiter && !this.wasCut) this.events.push(EV_CUT, 1);
    this.wasCut = limiter;
    const cut = this.shiftTimer > 0 || limiter;
    let force = cut ? 0 : (torque * ratio * t.driveEfficiency) / t.wheelRadius;
    if (reversing) force = u < -MAX_REVERSE_SPEED ? 0 : -force;
    this.driveForce = force;
  }

  addNitro(amount: number): void {
    this.nitroLevel = clamp(this.nitroLevel + amount, 0, 1);
  }
}
