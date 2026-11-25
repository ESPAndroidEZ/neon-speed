import { clamp } from '../core/math';
import { STYLE } from '../physics/drivingStyle';

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
/** Street driving style: quicker at speed (the keys reach lock sooner and swap sides faster). */
export const STREET_RAMP: RampRates = { riseSlow: 9, riseFast: 4.6, returnSlow: 11, returnFast: 8, crossSlow: 18, crossFast: 11.5, fastKph: 180 };

/** Turns a held key (-1, 0, +1) into a smooth -1..1 stick. Pure and allocation free: the keyboard, touch buttons and test bots share it. */
export class SteerRamp {
  value = 0;
  readonly rates: RampRates;
  /** Player ramps (keyboard, touch) follow the driving style; bots and tests keep their fixed rates. */
  private readonly styled: boolean;

  constructor(rates: RampRates = KEY_RAMP, styled = false) {
    this.rates = rates;
    this.styled = styled;
  }

  update(want: number, speedKph: number, dt: number): number {
    const q = this.styled && STYLE.id === 'STREET' ? STREET_RAMP : this.rates;
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
