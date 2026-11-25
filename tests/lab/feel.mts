import { CARS } from '../../src/data/cars.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning, type CarTuning } from '../../src/physics/carTuning.ts';
import { WEATHER } from '../../src/physics/weather.ts';
import type { CarInput } from '../../src/types/game.ts';

/* Feel lab: straight-line and cornering numbers per car, on a flat open pad in CLEAR (no track walls).
   Usage: npx tsx tests/lab/feel.mts [classic|street]  (street needs src/physics/drivingStyle.ts). */
const D = 1 / 60;
export interface Feel { car: string; t100: number; r60: number; r100: number; slip100: number; hbSlip: number; hbTurn: number; powerSlip: number; nitroGain: number }

const inp: CarInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
const idle = (): void => { inp.throttle = 0; inp.brake = 0; inp.steer = 0; inp.handbrake = false; inp.nitro = false; };

function make(id: string, mod?: (t: CarTuning) => void): CarController {
  const t = applyTuning(createDefaultTuning(), CARS.find((c) => c.id === id)!.tuning);
  mod?.(t);
  const car = new CarController(t);
  car.reset(0, 0, 0);
  return car;
}
/** Full throttle in a straight line until `v` m/s (max 40 s); returns the time. */
function runTo(car: CarController, v: number): number {
  idle(); inp.throttle = 1;
  let n = 0;
  while (car.state.speed < v && n < 2400) { car.step(D, inp, WEATHER.CLEAR); n++; }
  return n * D;
}
/** Hold speed with throttle / brake for `secs` while steering `steer`; calls `each` per step. */
function hold(car: CarController, v: number, steer: number, secs: number, each?: () => void): void {
  for (let i = 0; i < secs * 60; i++) {
    const e = v - car.state.speed;
    inp.steer = steer; inp.throttle = Math.min(1, Math.max(0, 0.35 + e * 0.6)); inp.brake = e < -1.5 ? 0.3 : 0;
    car.step(D, inp, WEATHER.CLEAR); each?.();
  }
}
/** Steady full-lock radius (m) at `kph`: speed / yaw rate averaged over the last second of 4 s. */
let peak = 0;
function radius(id: string, kph: number, mod?: (t: CarTuning) => void): number {
  const car = make(id, mod), v = kph / 3.6;
  runTo(car, v);
  peak = 0;
  hold(car, v, 1, 3, () => { peak = Math.max(peak, Math.abs(car.state.slipAngle)); });
  let r = 0;
  hold(car, v, 1, 1, () => { r += Math.abs(car.state.speed / Math.max(1e-3, Math.abs(car.state.yawRate))); peak = Math.max(peak, Math.abs(car.state.slipAngle)); });
  return r / 60;
}

export function measure(id: string, mod?: (t: CarTuning) => void): Feel {
  const a = make(id, mod);
  const t100 = runTo(a, 100 / 3.6);
  // handbrake entry at 80 km/h: full lock + handbrake 0.6 s, half throttle; peak slip and heading change after 2.5 s
  const h = make(id, mod);
  runTo(h, 80 / 3.6);
  const h0 = h.state.heading;
  let hbSlip = 0;
  for (let i = 0; i < 150; i++) {
    inp.steer = 1; inp.throttle = 0.5; inp.brake = 0; inp.handbrake = i < 36;
    h.step(D, inp, WEATHER.CLEAR); hbSlip = Math.max(hbSlip, Math.abs(h.state.slipAngle));
  }
  const hbTurn = Math.abs(h.state.heading - h0);
  // power slide: 50 km/h, then full lock + full throttle for 2 s; peak slip
  const p = make(id, mod);
  runTo(p, 50 / 3.6);
  let powerSlip = 0;
  idle();
  for (let i = 0; i < 120; i++) { inp.steer = 1; inp.throttle = 1; p.step(D, inp, WEATHER.CLEAR); powerSlip = Math.max(powerSlip, Math.abs(p.state.slipAngle)); }
  // nitro: km/h gained over 3 s from 100 km/h, with minus without
  const gain = (nitro: boolean): number => {
    const c = make(id, mod);
    runTo(c, 100 / 3.6); c.drivetrain.nitroLevel = 1;
    const v0 = c.state.speed;
    idle(); inp.throttle = 1; inp.nitro = nitro;
    for (let i = 0; i < 180; i++) c.step(D, inp, WEATHER.CLEAR);
    return (c.state.speed - v0) * 3.6;
  };
  const r60 = radius(id, 60, mod), r100 = radius(id, 100, mod), slip100 = peak;
  return { car: id, t100, r60, r100, slip100, hbSlip, hbTurn, powerSlip, nitroGain: gain(true) - gain(false) };
}

export const fmt = (f: Feel): string =>
  `${f.car.padEnd(7)} 0-100 ${f.t100.toFixed(2)} s  R60 ${f.r60.toFixed(1)} m  R100 ${f.r100.toFixed(1)} m (slip ${(f.slip100 * 57.3).toFixed(0)})  hb slip ${(f.hbSlip * 57.3).toFixed(0)} deg turn ${(f.hbTurn * 57.3).toFixed(0)} deg  power slip ${(f.powerSlip * 57.3).toFixed(1)} deg  nitro +${f.nitroGain.toFixed(1)} km/h`;

if (process.argv[1]?.endsWith('feel.mts')) {
  const style = process.argv[2] ?? 'classic';
  const mod = style === 'street' ? (await import('../../src/physics/drivingStyle.ts')).streetTuning : undefined;
  console.log(`== feel lab: ${style}`);
  for (const c of CARS) console.log(fmt(measure(c.id, mod)));
}
