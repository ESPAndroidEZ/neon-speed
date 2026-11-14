import { clamp } from '../core/math';
import { GEAR_RATIOS, REVERSE_RATIO, type CarTuning } from './carTuning';

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
  private shiftTimer = 0;
  private readonly t: CarTuning;

  constructor(t: CarTuning) {
    this.t = t;
    this.rpm = t.idleRpm;
  }

  reset(): void {
    this.gear = 1;
    this.rpm = this.t.idleRpm;
    this.nitroLevel = 1;
    this.nitroActive = false;
    this.driveForce = 0;
    this.brakeCmd = 0;
    this.shiftTimer = 0;
  }

  /** u = signed forward speed (m/s). */
  update(dt: number, u: number, throttle: number, brake: number, nitroKey: boolean): void {
    const t = this.t;
    // Holding brake at a standstill engages reverse; throttle from reverse goes forward again.
    if (this.gear > 0 && u < 0.6 && brake > 0.1 && throttle < 0.05) this.gear = -1;
    else if (this.gear < 0 && u > -0.6 && throttle > 0.1 && brake < 0.05) this.gear = 1;
    const reversing = this.gear < 0;
    const pedal = reversing ? brake : throttle;
    this.brakeCmd = reversing ? throttle : brake;

    const ratio = (reversing ? REVERSE_RATIO : GEAR_RATIOS[this.gear - 1]) * t.finalDrive;
    const wheelRpm = (Math.abs(u) / t.wheelRadius) * ratio * RAD_S_TO_RPM;
    const target = Math.max(wheelRpm, t.idleRpm + (pedal > 0.05 ? pedal * 3000 : 0));
    this.rpm += (target - this.rpm) * Math.min(1, dt * 12);

    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    if (this.gear > 0 && this.shiftTimer === 0) {
      if (this.rpm > t.redlineRpm * t.upshiftFrac && this.gear < GEAR_RATIOS.length && pedal > 0.15) {
        this.gear++;
        this.shiftTimer = t.shiftTime;
      } else if (this.rpm < t.redlineRpm * t.downshiftFrac && this.gear > 1) {
        this.gear--;
        this.shiftTimer = t.shiftTime * 0.5;
      }
    }

    const wantNitro = nitroKey && this.nitroLevel > 0.01 && pedal > 0.1 && !reversing;
    this.nitroActive = wantNitro;
    if (wantNitro) this.nitroLevel = Math.max(0, this.nitroLevel - t.nitroBurnPerSec * dt);

    const x = (this.rpm - t.peakRpm) / t.torqueWidth;
    let torque = t.engineTorque * Math.max(0.3, 1 - x * x) * pedal;
    if (wantNitro) torque *= t.nitroTorqueMul;
    const cut = this.shiftTimer > 0 || this.rpm >= t.redlineRpm;
    let force = cut ? 0 : (torque * ratio * t.driveEfficiency) / t.wheelRadius;
    if (reversing) force = u < -MAX_REVERSE_SPEED ? 0 : -force;
    this.driveForce = force;
  }

  addNitro(amount: number): void {
    this.nitroLevel = clamp(this.nitroLevel + amount, 0, 1);
  }
}
