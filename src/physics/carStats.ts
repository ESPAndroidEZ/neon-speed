import { CarController } from './carController';
import { applyTuning, createDefaultTuning, type CarTuning } from './carTuning';
import { WEATHER } from './weather';
import { createNeutralInput } from '../types/game';

export interface CarStats {
  /** 0-100 km/h, seconds. */
  accel: number;
  /** Top speed, km/h. */
  topKph: number;
  /** Peak slip angle (rad) of a handbrake flick at 25 m/s: how readily it slides. */
  slide: number;
  /** Peak lateral acceleration proxy: rear grip coefficient. */
  grip: number;
}

const D = 1 / 60;

/** Measure a car headlessly from its tuning (used by the garage and the tests). ~5000 physics steps. */
export function measureCar(overrides: Partial<CarTuning>): CarStats {
  const t = applyTuning(createDefaultTuning(), overrides);
  const c = new CarController(t);
  c.reset();
  const gas = createNeutralInput();
  gas.throttle = 1;
  let accel = 0;
  while (c.state.speed * 3.6 < 100 && accel < 20) {
    c.step(D, gas, WEATHER.CLEAR);
    accel += D;
  }
  for (let k = 0; k < 60 * 70; k++) c.step(D, gas, WEATHER.CLEAR);
  const topKph = c.state.speed * 3.6;

  const h = new CarController(t);
  h.reset();
  const cruise = createNeutralInput();
  cruise.throttle = 0.6;
  while (h.state.speed < 25) h.step(D, cruise, WEATHER.CLEAR);
  const flick = { ...cruise, handbrake: true, steer: 1, throttle: 0.4 };
  let slide = 0;
  for (let k = 0; k < 60; k++) {
    h.step(D, flick, WEATHER.CLEAR);
    slide = Math.max(slide, Math.abs(h.state.slipAngle));
  }
  return { accel, topKph, slide, grip: t.gripRear };
}
