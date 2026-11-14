import { clamp } from '../core/math';

/** Digital-steering ramp rates (per second), blended from the slow set to the fast set as speed rises to `fastKph`. */
export interface RampRates {
  riseSlow: number;
  riseFast: number;
  returnSlow: number;
  returnFast: number;
  crossSlow: number;
  crossFast: number;
  fastKph: number;
}

// Quick and decisive when slow (hairpins, parking), softer at speed (no twitching on a straight).
export const KEY_RAMP: RampRates = { riseSlow: 8, riseFast: 3.4, returnSlow: 10, returnFast: 6.5, crossSlow: 16, crossFast: 9, fastKph: 180 };

/** Turns a held key (-1, 0, +1) into a smooth -1..1 stick. Pure and allocation free: the keyboard, touch buttons and test bots share it. */
export class SteerRamp {
  value = 0;
  readonly rates: RampRates;

  constructor(rates: RampRates = KEY_RAMP) {
    this.rates = rates;
  }

  update(want: number, speedKph: number, dt: number): number {
    const q = this.rates;
    const k = clamp(speedKph / q.fastKph, 0, 1);
    let rate = q.returnSlow + (q.returnFast - q.returnSlow) * k;
    if (want !== 0) {
      const crossing = this.value !== 0 && Math.sign(want) !== Math.sign(this.value);
      rate = crossing ? q.crossSlow + (q.crossFast - q.crossSlow) * k : q.riseSlow + (q.riseFast - q.riseSlow) * k;
    }
    this.value += clamp(want - this.value, -rate * dt, rate * dt);
    return this.value;
  }
}
