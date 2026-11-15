import { clamp } from '../../core/math';
import type { CarTuning } from '../carTuning';

const G = 9.81;
const TRACK = 1.5; // wheel track in metres (same for every car, only used for roll transfer)
const TAU = 0.1; // suspension response, seconds

/**
 * Weight transfer for the bicycle model. Braking loads the front axle, acceleration the rear.
 * Cornering moves load to the outside wheels; because tyres lose grip per newton as load rises, an axle that
 * carries more of that transfer (`rollFront`) loses more grip: front-heavy roll gives understeer, rear gives oversteer.
 * Pure arithmetic, no allocation. `ax` forward and `ay` sideways are smoothed body accelerations in m/s^2.
 */
export class LoadTransfer {
  ax = 0;
  ay = 0;
  /** Dynamic axle loads (N). */
  fzF = 0;
  fzR = 0;
  /** Static rear axle load (N). */
  staticR = 0;
  /** Grip multipliers from outside-wheel load transfer (1 = none). */
  gripF = 1;
  gripR = 1;

  reset(t: CarTuning): void {
    this.ax = 0;
    this.ay = 0;
    this.update(0, t, 0, 0);
  }

  update(dt: number, t: CarTuning, axRaw: number, ayRaw: number): void {
    const k = dt <= 0 ? 1 : Math.min(1, dt / TAU);
    this.ax += (axRaw - this.ax) * k;
    this.ay += (ayRaw - this.ay) * k;
    const wb = t.cgToFront + t.cgToRear;
    const staticF = (t.mass * G * t.cgToRear) / wb;
    const total = t.mass * G;
    this.staticR = total - staticF;
    const shift = (t.mass * this.ax * t.cgHeight) / wb;
    this.fzF = clamp(staticF - shift, staticF * 0.45, staticF * 1.7);
    this.fzR = total - this.fzF;
    const roll = (t.mass * Math.abs(this.ay) * t.cgHeight) / TRACK;
    const qf = clamp((roll * t.rollFront) / (this.fzF * 0.5), 0, 0.95);
    const qr = clamp((roll * (1 - t.rollFront)) / (this.fzR * 0.5), 0, 0.95);
    this.gripF = 1 - t.loadSens * qf * qf;
    this.gripR = 1 - t.loadSens * qr * qr;
  }
}
