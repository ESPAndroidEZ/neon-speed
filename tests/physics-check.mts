import { CarController } from '../src/physics/carController.ts';
import { createDefaultTuning } from '../src/physics/carTuning.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { CarInput, Weather } from '../src/types/game.ts';

const DT = 1 / 60;
let failed = 0;
const check = (name: string, ok: boolean, info: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${info})`);
};
const mk = (): CarController => {
  const c = new CarController(createDefaultTuning());
  c.reset();
  return c;
};
const run = (c: CarController, secs: number, inp: CarInput, w: Weather = 'CLEAR'): void => {
  for (let i = 0; i < secs * 60; i++) c.step(DT, inp, WEATHER[w]);
};
const inp = (o: Partial<CarInput>): CarInput => ({ ...createNeutralInput(), ...o });

// 0-100 km/h
{
  const c = mk();
  const i = inp({ throttle: 1 });
  let t = 0;
  while (c.state.speed * 3.6 < 100 && t < 20) {
    c.step(DT, i, WEATHER.CLEAR);
    t += DT;
  }
  check('0-100 km/h ~5.5s', t > 5.0 && t < 6.0, `${t.toFixed(2)}s`);
}

// gears in order, rpm <= redline, top speed
{
  const c = mk();
  const i = inp({ throttle: 1 });
  let last = 1;
  let ordered = true;
  let maxRpm = 0;
  for (let k = 0; k < 60 * 60; k++) {
    c.step(DT, i, WEATHER.CLEAR);
    const g = c.drivetrain.gear;
    if (g < last) ordered = false;
    if (g > last + 1) ordered = false;
    last = g;
    maxRpm = Math.max(maxRpm, c.drivetrain.rpm);
  }
  const top = c.state.speed * 3.6;
  check('gears shift in order', ordered && last === 6, `final gear ${last}`);
  check('rpm <= redline', maxRpm <= 7500 + 1, `max ${maxRpm.toFixed(0)}`);
  check('top speed 220-260', top >= 220 && top <= 260, `${top.toFixed(0)} km/h`);
}

// random input stability + determinism
const randomRun = (): number[] => {
  let seed = 12345;
  const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const c = mk();
  const i = createNeutralInput();
  let bad = false;
  for (let k = 0; k < 60 * 60; k++) {
    if (k % 20 === 0) {
      i.throttle = rnd() < 0.7 ? 1 : 0;
      i.brake = rnd() < 0.2 ? 1 : 0;
      i.steer = rnd() * 2 - 1;
      i.handbrake = rnd() < 0.15;
      i.nitro = rnd() < 0.3;
    }
    c.step(DT, i, WEATHER[(['CLEAR', 'RAIN', 'SNOW'] as const)[k % 3000 < 1000 ? 0 : k % 3000 < 2000 ? 1 : 2]]);
    const s = c.state;
    const vals = [s.position.x, s.position.z, s.heading, s.speed, s.yawRate, s.slipAngle, c.drivetrain.rpm];
    if (vals.some((x) => !Number.isFinite(x)) || Math.abs(s.speed) > 120 || Math.abs(s.yawRate) > 15) bad = true;
  }
  const s = c.state;
  return [bad ? 1 : 0, s.position.x, s.position.z, s.heading, s.speed];
};
{
  const a = randomRun();
  const b = randomRun();
  check('no NaN / runaway, 60s random', a[0] === 0, `speed ${a[4].toFixed(1)}`);
  check('deterministic', a.every((x, k) => x === b[k]), `x ${a[1].toFixed(3)}`);
}

// handbrake slide at 25 m/s
{
  const c = mk();
  run(c, 12, inp({ throttle: 1 }));
  // settle to ~25 m/s with light throttle
  while (c.state.speed > 25) c.step(DT, inp({}), WEATHER.CLEAR);
  while (c.state.speed < 25) c.step(DT, inp({ throttle: 0.6 }), WEATHER.CLEAR);
  let peak = 0;
  for (let k = 0; k < 60; k++) {
    c.step(DT, inp({ handbrake: true, steer: 1, throttle: 0.4 }), WEATHER.CLEAR);
    peak = Math.max(peak, Math.abs(c.state.slipAngle));
  }
  check('handbrake slip 0.3-1.4 rad', peak >= 0.3 && peak <= 1.4, `peak ${peak.toFixed(2)}`);
  let t = 0;
  const rel = inp({ throttle: 0.3 });
  while (Math.abs(c.state.slipAngle) > 0.12 && t < 8) {
    c.step(DT, rel, WEATHER.CLEAR);
    t += DT;
  }
  check('recovers after release', t < 3.5, `${t.toFixed(2)}s, slip ${c.state.slipAngle.toFixed(2)}`);
}

// braking distance ratios
const brakeDist = (w: Weather): number => {
  const c = mk();
  const i = inp({ throttle: 1 });
  while (c.state.speed < 30) c.step(DT, i, WEATHER.CLEAR);
  const z0 = c.state.position.z;
  const x0 = c.state.position.x;
  const b = inp({ brake: 1 });
  let n = 0;
  while (c.state.speed > 0.3 && n++ < 60 * 30) c.step(DT, b, WEATHER[w]);
  return Math.hypot(c.state.position.z - z0, c.state.position.x - x0);
};
{
  const d0 = brakeDist('CLEAR');
  const dr = brakeDist('RAIN');
  const ds = brakeDist('SNOW');
  check('brake dist rain ~1.4x', dr / d0 > 1.25 && dr / d0 < 1.55, `${d0.toFixed(1)}m -> ${dr.toFixed(1)}m x${(dr / d0).toFixed(2)}`);
  check('brake dist snow ~2.2x', ds / d0 > 1.95 && ds / d0 < 2.5, `${ds.toFixed(1)}m x${(ds / d0).toFixed(2)}`);
}

// reverse
{
  const c = mk();
  run(c, 3, inp({ brake: 1 }));
  check('brake from standstill reverses', c.state.speed < -2 && c.drivetrain.gear === -1, `speed ${c.state.speed.toFixed(1)}`);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
