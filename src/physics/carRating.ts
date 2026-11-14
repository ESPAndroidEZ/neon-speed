import { CarController } from './carController';
import { applyTuning, createDefaultTuning, type CarTuning } from './carTuning';
import { WEATHER } from './weather';
import { createNeutralInput } from '../types/game';

export type CarClass = 'D' | 'C' | 'B' | 'A' | 'S';

/** PR class thresholds (lower bounds). Event restrictions and opponent matching use these. */
export const CLASS_MIN: Record<CarClass, number> = { D: 0, C: 400, B: 500, A: 600, S: 700 };
export const CLASSES: readonly CarClass[] = ['D', 'C', 'B', 'A', 'S'];

export const classOf = (pr: number): CarClass => [...CLASSES].reverse().find((c) => pr >= CLASS_MIN[c]) ?? 'D';
export const allowedInClass = (maxClass: CarClass, pr: number): boolean => CLASSES.indexOf(classOf(pr)) <= CLASSES.indexOf(maxClass);

const D = 1 / 60;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export interface Rating {
  pr: number;
  cls: CarClass;
  accel: number;
  topKph: number;
  brake30: number;
}

/**
 * Performance Rating from a headless measurement of the tuning: 0-100 km/h, top speed, 30 m/s braking distance, plus grip, weight
 * and centre of gravity from the numbers. Every upgrade improves at least one term and none worsens another, so PR only goes up.
 * About 4000 physics steps; cache the result per tuning in the UI.
 */
export function rate(overrides: Partial<CarTuning> | CarTuning): Rating {
  const t = applyTuning(createDefaultTuning(), overrides);
  const c = new CarController(t);
  c.reset();
  const gas = createNeutralInput();
  gas.throttle = 1;
  let accel = 0;
  let prev = 0;
  while (c.state.speed * 3.6 < 100 && accel < 20) {
    prev = c.state.speed;
    c.step(D, gas, WEATHER.CLEAR);
    accel += D;
  }
  accel -= (D * (c.state.speed - 100 / 3.6)) / Math.max(1e-6, c.state.speed - prev); // interpolate the crossing: no 1/60 s steps in the rating
  let top = 0;
  for (let k = 0; k < 60 * 40; k++) {
    c.step(D, gas, WEATHER.CLEAR);
    if (k >= 60 * 38) top += c.state.speed / 120; // mean of the last two seconds: the rev limiter cuts in and out
  }
  const topKph = top * 3.6;
  const b = new CarController(t);
  b.reset();
  while (b.state.speed < 30) b.step(D, gas, WEATHER.CLEAR);
  const z0 = b.state.position.z;
  const brake = { ...createNeutralInput(), brake: 1 };
  let n = 0;
  while (b.state.speed > 0.3 && n++ < 60 * 20) b.step(D, brake, WEATHER.CLEAR);
  const brake30 = Math.abs(b.state.position.z - z0);
  const grip = ((t.gripFront + t.gripRear) / 2) * (1 - t.loadSens * 0.4) * (1 + (0.45 - t.cgHeight) * 0.5);
  const score = 0.3 * clamp01((7.2 - accel) / 4) + 0.2 * clamp01((topKph - 170) / 140) + 0.25 * clamp01((grip - 0.95) / 0.95) + 0.15 * clamp01((52 - brake30) / 24) + 0.1 * clamp01((1750 - t.mass) / 650);
  const pr = Math.round(100 + score * 900);
  return { pr, cls: classOf(pr), accel, topKph, brake30 };
}
