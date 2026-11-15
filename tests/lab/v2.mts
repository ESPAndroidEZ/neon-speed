import { clamp, wrapAngle } from '../../src/core/math.ts';
import { CARS } from '../../src/data/cars.ts';
import { HANDLING, type StabilityLevel } from '../../src/physics/assists.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { WEATHER } from '../../src/physics/weather.ts';
import { createNeutralInput, type Weather } from '../../src/types/game.ts';

/* Headless manoeuvres for the v2 handling targets (docs/handling-plan.md sections 5-6). Weather = the NORMAL levels. */
const D = 1 / 60;
const G = 9.81;
export const IDS = CARS.map((c) => c.id);

export function car(id: string, stab: StabilityLevel = 'LIGHT'): CarController {
  HANDLING.model = 'v2';
  const c = new CarController(applyTuning(createDefaultTuning(), CARS.find((s) => s.id === id)!.tuning));
  c.stability = stab;
  c.reset();
  return c;
}

/** Yaw-rate tracking driver: integrates the stick toward the wanted yaw rate (works with any steering lock). */
class Driver {
  steer = 0;
  update(c: CarController, wantR: number): number {
    this.steer = clamp(this.steer + (wantR - c.r) * 1.6 * D + (wantR - c.r) * 0.0, -1, 1);
    return this.steer;
  }
}
const cruise = (c: CarController, v: number): number => clamp((v - c.u) * 0.6 + 0.15, 0, 1);

/** Steady-state skidpad on R (m): speed ramps up until the car can no longer hold the circle. Returns peak g. */
export function skidpad(id: string, w: Weather = 'CLEAR', R = 40, stab: StabilityLevel = 'LIGHT'): number {
  const c = car(id, stab), dr = new Driver(), inp = createNeutralInput();
  let vt = 8, best = 0, avg = 0;
  const cx = R; // circle centre to the left (+X) of the start
  for (let k = 0; k < 60 * 120; k++) {
    const s = c.state;
    const dx = s.position.x - cx, dz = s.position.z;
    const dist = Math.hypot(dx, dz);
    const tang = Math.atan2(dz, -dx); // counter-clockwise seen from above: heading of the tangent
    const he = wrapAngle(tang - s.heading);
    const want = (c.u / R) * (1 + 0.08 * (dist - R)) + 1.2 * he;
    inp.steer = dr.update(c, want);
    inp.throttle = cruise(c, vt);
    c.step(D, inp, WEATHER[w]);
    if (k > 180) vt += 0.12 * D;
    avg += (c.u * c.r - avg) * 0.03;
    if (Math.abs(dist - R) < 1.5 && Math.abs(c.state.slipAngle) < 0.3 && k > 240) best = Math.max(best, Math.abs(avg));
    if (Math.abs(dist - R) > 4 && k > 240) break;
  }
  return best / G;
}

/** Seconds from standstill to `kph` at full throttle (60 s cap). */
export function accelTo(id: string, kph: number): number {
  const c = car(id), inp = createNeutralInput();
  inp.throttle = 1;
  let t = 0;
  while (c.u * 3.6 < kph && t < 60) { c.step(D, inp, WEATHER.CLEAR); t += D; }
  return t;
}

/** Stopping distance (m) from 100 km/h, full brake, straight. */
export function brake100(id: string, w: Weather, stab: StabilityLevel = 'LIGHT'): number {
  const c = car(id, stab), inp = createNeutralInput();
  inp.throttle = 1;
  while (c.u * 3.6 < 100) c.step(D, inp, WEATHER.CLEAR);
  inp.throttle = 0;
  inp.brake = 1;
  const z0 = c.state.position.z;
  let k = 0;
  while (c.u > 0.3 && k++ < 60 * 20) c.step(D, inp, WEATHER[w]);
  return c.state.position.z - z0;
}

/** Path follower for a lateral path x(z): pure pursuit -> wanted yaw rate. */
function follow(c: CarController, dr: Driver, path: (z: number) => number): number {
  const s = c.state, ld = Math.max(5, 0.45 * c.u);
  const tz = s.position.z + ld, tx = path(tz);
  const a = wrapAngle(Math.atan2(tx - s.position.x, tz - s.position.z) - s.heading);
  return dr.update(c, (2 * Math.sin(a) * c.u) / ld);
}

/** Highest entry speed (km/h) through 8 cones 18 m apart (weave amplitude 1.4 m) without leaving the lane or sliding. */
export function slalom(id: string, stab: StabilityLevel = 'LIGHT'): number {
  const A = 1.4, S = 18;
  const pass = (v: number): boolean => {
    const c = car(id, stab), dr = new Driver(), inp = createNeutralInput();
    c.u = v;
    const path = (z: number): number => (z < 20 ? 0 : A * Math.sin((Math.PI * (z - 20)) / S));
    while (c.state.position.z < 20 + S * 8) {
      inp.steer = follow(c, dr, path);
      inp.throttle = cruise(c, v);
      c.step(D, inp, WEATHER.CLEAR);
      const z = c.state.position.z;
      if (z > 20 && (Math.abs(c.state.position.x - path(z)) > 0.9 || Math.abs(c.state.slipAngle) > 0.3)) return false;
    }
    return true;
  };
  let lo = 6, hi = 30;
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (pass(m)) lo = m; else hi = m; }
  return lo * 3.6;
}

/** Understeer gradient (deg/g) from a ramp-steer at 60 km/h (ay 0.15..0.5 g), and the same on full power from 0.4 g. */
export function understeer(id: string): { cruise: number; power: number } {
  const c = car(id), inp = createNeutralInput(), L = c.v2.wb, v = 60 / 3.6;
  c.u = v;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0, hold = 0;
  for (let k = 0; k < 60 * 12; k++) {
    inp.steer = Math.min(1, k / (60 * 12));
    inp.throttle = cruise(c, v);
    c.step(D, inp, WEATHER.CLEAR);
    const ay = c.u * c.r, x = Math.abs(ay) / G, y = c.v2.delta - L * (c.r / Math.max(1, c.u));
    if (x > 0.15 && x < 0.5) { sx += x; sy += y; sxx += x * x; sxy += x * y; n++; }
    if (!hold && x > 0.4) hold = inp.steer;
  }
  const slope = (n * sxy - sx * sy) / Math.max(1e-9, n * sxx - sx * sx);
  // power: settle at the 0.4 g steer, then full throttle for 1 s
  const p = car(id), pi = createNeutralInput();
  p.u = v;
  let acc = 0, m = 0;
  for (let k = 0; k < 60 * 6; k++) {
    pi.steer = hold || 0.5;
    pi.throttle = k < 60 * 5 ? cruise(p, v) : 1;
    p.step(D, pi, WEATHER.CLEAR);
    if (k > 60 * 5 + 18) { const ay = Math.abs(p.u * p.r) / G; acc += (p.v2.delta - L * (p.r / Math.max(1, p.u))) / Math.max(0.05, ay); m++; }
  }
  return { cruise: (slope * 180) / Math.PI, power: ((acc / Math.max(1, m)) * 180) / Math.PI };
}

/** Throttle exit: on a R 30 m circle at 60 % of the weather's limit, full throttle for 2 s while holding the line.
 * Returns the speed gained (km/h) and the mean lateral g held over the 2 s (0 after losing the line). */
export function exitGain(id: string, w: Weather): { gain: number; lat: number } {
  const R = 30, c = car(id), dr = new Driver(), inp = createNeutralInput();
  const v0 = Math.sqrt(0.6 * G * WEATHER[w].grip * R);
  c.u = v0;
  let start = 0, lat = 0;
  for (let k = 0; k < 60 * 9; k++) {
    const s = c.state, dx = s.position.x - R, dz = s.position.z, dist = Math.hypot(dx, dz);
    const he = wrapAngle(Math.atan2(dz, -dx) - s.heading);
    inp.steer = dr.update(c, (c.u / R) * (1 + 0.08 * (dist - R)) + 1.2 * he);
    const on = k >= 60 * 7;
    if (k === 60 * 7) start = c.u;
    inp.throttle = on ? 1 : cruise(c, v0);
    c.step(D, inp, WEATHER[w]);
    if (on && (Math.abs(dist - R) > 3 || Math.abs(c.state.slipAngle) > 0.45)) break;
    if (on) lat += Math.abs(c.u * c.r) / G / 120;
  }
  return { gain: (c.u - start) * 3.6, lat };
}
