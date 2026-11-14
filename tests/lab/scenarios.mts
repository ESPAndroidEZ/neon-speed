import { clamp } from '../../src/core/math.ts';
import { CARS } from '../../src/data/cars.ts';
import { SteerRamp } from '../../src/input/steerRamp.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning, type CarTuning } from '../../src/physics/carTuning.ts';
import { envFor } from '../../src/physics/weatherLevels.ts';
import { createNeutralInput, type CarInput, type Weather } from '../../src/types/game.ts';

const D = 1 / 60;
export type Mod = (t: CarTuning, id: string) => void;
type Drive = (t: number, car: CarController, inp: CarInput, ramp: SteerRamp) => void;

/** Flat, wall-less skid pad: bring the car to `kph`, then run `drive` for `secs` and hand every step to `watch`. */
function pad(id: string, tune: Mod | undefined, w: Weather, kph: number, secs: number, drive: Drive, watch: (t: number, car: CarController) => void): void {
  const spec = CARS.find((c) => c.id === id)!;
  const tuning = applyTuning(createDefaultTuning(), spec.tuning);
  tune?.(tuning, id);
  const car = new CarController(tuning);
  const env = envFor(w, 'AGGRESSIVE');
  const inp = createNeutralInput();
  car.reset(0, 0, 0);
  let n = 0;
  while (car.u * 3.6 < kph && n++ < 60 * 60) { inp.throttle = 1; car.step(D, inp, env); }
  const ramp = new SteerRamp();
  for (let k = 0; k < secs * 60; k++) {
    inp.throttle = 0; inp.brake = 0; inp.handbrake = false;
    drive(k * D, car, inp, ramp);
    car.step(D, inp, env);
    watch(k * D, car);
  }
}
const key = (inp: CarInput, ramp: SteerRamp, car: CarController, want: number): void => { inp.steer = ramp.update(want, Math.abs(car.u) * 3.6, D); };

export interface Scen {
  /** Peak slide angle (rad) 1.5 s after a handbrake flick at 90 km/h: how easy a drift is to start. */
  driftStart: number;
  /** Share of 4 s spent between 0.25 and 0.95 rad while a simple driver holds the slide on the throttle. */
  driftHold: number;
  /** Seconds from releasing everything in a 0.5 rad slide until the car is straight, and the worst angle on the way (spin if > 1.2). */
  recoverT: number; recoverMax: number;
  /** Seconds to 63 % of the peak yaw rate after a key is held, at 40 / 80 / 120 km/h. */
  resp40: number; resp80: number; resp120: number;
  /** A 0.12 s key tap at 200 km/h: sideways jump after 1.5 s (m), worst slide angle and yaw direction changes. */
  tapShift: number; tapSlip: number; tapWobble: number;
  /** Worst slide angle while braking hard from 180 km/h with the key held for 0.6 s. */
  brakeSlip: number;
  /** Diameter (m) of a full-lock U-turn from rest on the throttle, and with the handbrake from 40 km/h. */
  uTurn: number; hbTurn: number;
  /** Reverse speed after 3 s (km/h). */
  reverse: number;
}

export function scenarios(id: string, tune?: Mod, w: Weather = 'CLEAR'): Scen {
  const o = { driftStart: 0, driftHold: 0, recoverT: 9, recoverMax: 0, resp40: 9, resp80: 9, resp120: 9, tapShift: 0, tapSlip: 0, tapWobble: 0, brakeSlip: 0, uTurn: 0, hbTurn: 0, reverse: 0 };
  const slip = (c: CarController): number => Math.abs(Math.atan2(c.v, Math.abs(c.u) + 0.01));
  pad(id, tune, w, 90, 1.5, (t, c, i, r) => { key(i, r, c, 1); i.handbrake = t < 0.4; i.throttle = 1; }, (_t, c) => { o.driftStart = Math.max(o.driftStart, slip(c)); });
  let held = 0;
  pad(id, tune, w, 90, 5, (t, c, i, r) => {
    if (t < 0.5) { key(i, r, c, 1); i.handbrake = t < 0.4; i.throttle = 1; return; }
    const b = Math.atan2(c.v, Math.abs(c.u) + 0.01); // left drift: b < 0, counter-steer = right
    i.steer = clamp((-0.5 - b) * -3 + c.r * -0.4, -1, 1);
    i.throttle = slip(c) > 0.7 ? 0.4 : 1;
  }, (t, c) => { if (t >= 1 && slip(c) > 0.25 && slip(c) < 0.95) held++; });
  o.driftHold = held / (4 * 60);
  let rec = -1;
  pad(id, tune, w, 90, 5, (t, c, i, r) => { if (t < 0.7) { key(i, r, c, 1); i.handbrake = t < 0.45; i.throttle = 1; } else key(i, r, c, 0); },
    (t, c) => { if (t < 0.7) return; o.recoverMax = Math.max(o.recoverMax, slip(c)); if (rec < 0 && slip(c) < 0.06 && Math.abs(c.r) < 0.08) rec = t - 0.7; if (slip(c) > 0.1) rec = -1; });
  o.recoverT = rec < 0 ? 9 : rec;
  for (const kph of [40, 80, 120] as const) {
    const rs: number[] = [];
    pad(id, tune, w, kph, 1.5, (_t, c, i, r) => { key(i, r, c, 1); i.throttle = 0.4; }, (_t, c) => { rs.push(Math.abs(c.r)); });
    const peak = Math.max(...rs);
    o[`resp${kph}`] = rs.findIndex((v) => v >= peak * 0.63) * D;
  }
  let last = 0;
  pad(id, tune, w, 200, 1.5, (t, c, i, r) => { key(i, r, c, t < 0.12 ? 1 : 0); i.throttle = 1; }, (_t, c) => {
    o.tapSlip = Math.max(o.tapSlip, slip(c)); o.tapShift = Math.abs(c.state.position.x);
    const sg = Math.abs(c.r) > 0.02 ? Math.sign(c.r) : 0;
    if (sg !== 0 && last !== 0 && sg !== last) o.tapWobble++;
    if (sg !== 0) last = sg;
  });
  pad(id, tune, w, 180, 2.5, (t, c, i, r) => { key(i, r, c, t < 0.6 ? 1 : 0); i.brake = 1; }, (_t, c) => { if (c.u > 8) o.brakeSlip = Math.max(o.brakeSlip, slip(c)); });
  let minX = 0, maxX = 0;
  pad(id, tune, w, 0, 9, (_t, c, i, r) => { key(i, r, c, 1); i.throttle = c.u < 5 ? 0.5 : 0; }, (_t, c) => { if (Math.abs(c.state.heading) < 3.1 && maxX - minX >= 0) { minX = Math.min(minX, c.state.position.x); maxX = Math.max(maxX, c.state.position.x); } });
  o.uTurn = maxX - minX;
  minX = maxX = 0;
  let turned = 0, prevH = 0;
  pad(id, tune, w, 40, 5, (_t, c, i, r) => { key(i, r, c, 1); i.handbrake = turned < 2.6; i.throttle = turned < 2.6 ? 0 : 0.5; }, (_t, c) => {
    turned += Math.abs(Math.atan2(Math.sin(c.state.heading - prevH), Math.cos(c.state.heading - prevH))); prevH = c.state.heading;
    if (turned < 3.1) { minX = Math.min(minX, c.state.position.x); maxX = Math.max(maxX, c.state.position.x); }
  });
  o.hbTurn = turned >= 3.1 ? maxX - minX : 99;
  pad(id, tune, w, 0, 3, (_t, _c, i) => { i.brake = 1; }, (_t, c) => { o.reverse = -c.u * 3.6; });
  return o;
}

if (process.argv[1]?.endsWith('scenarios.mts')) {
  const keys = Object.keys(scenarios('civic')) as (keyof Scen)[];
  console.log('car    ' + keys.map((k) => k.padStart(10)).join(''));
  for (const c of CARS) { const s = scenarios(c.id); console.log(c.id.padEnd(7) + keys.map((k) => s[k].toFixed(2).padStart(10)).join('')); }
  const s = scenarios('350z', undefined, 'RAIN'); console.log('350z-R ' + keys.map((k) => s[k].toFixed(2).padStart(10)).join(''));
}
