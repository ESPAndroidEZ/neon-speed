import { CARS } from '../src/data/cars.ts';
import { applyUpgrades, sanitizeUpgrades, UPGRADES, UPGRADE_IDS, type Upgrades } from '../src/data/upgrades.ts';
import { applySetup, defaultSetup, sanitizeSetup, SETUP_RANGES, type Setup } from '../src/data/setup.ts';
import { allowedInClass, classOf, CLASS_MIN, rate } from '../src/physics/carRating.ts';
import { dynoCurve } from '../src/physics/dyno.ts';
import { CarController } from '../src/physics/carController.ts';
import { applyTuning, createDefaultTuning, type CarTuning } from '../src/physics/carTuning.ts';
import { createRng } from '../src/core/rng.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createNeutralInput } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const base = (id: string): CarTuning => applyTuning(createDefaultTuning(), CARS.find((c) => c.id === id)!.tuning);
const build = (id: string, up: Upgrades, setup: Setup = defaultSetup()): CarTuning => {
  const t = base(id);
  applyUpgrades(t, up, id);
  applySetup(t, setup);
  return t;
};
const all = (L: 0 | 1 | 2 | 3): Upgrades => Object.fromEntries(UPGRADE_IDS.map((id) => [id, id === 'stage' && L === 3 ? 4 : L])) as Upgrades; // maxed = Stage 4

check('8 categories: Power stage with 4 levels, the rest 3, prices rising', UPGRADES.length === 8 && UPGRADES.every((u) => u.levels.length === (u.id === 'stage' ? 4 : 3) && u.levels.every((l, i) => i === 0 || l.price > u.levels[i - 1].price)), '');
check('every part name is a fictional brand (no real company names)', UPGRADES.every((u) => u.levels.every((l) => !/(bosch|garrett|brembo|bilstein|michelin|nismo|trd|hks|apexi|greddy|tein|recaro|toyo|bridgestone)/i.test(l.name))), '');
check('the default setup changes nothing', JSON.stringify(build('evo', {})) === JSON.stringify(base('evo')), '');

// PR: monotonic in every category, for every car
for (const c of CARS) {
  const stock = rate(base(c.id)).pr;
  let ok = true;
  const notes: string[] = [];
  for (const u of UPGRADES) {
    if (u.needs === 'turbo' && base(c.id).turboTorque <= 0) continue;
    let prev = stock;
    for (const L of [1, 2, 3] as const) {
      const pr = rate(build(c.id, { [u.id]: L })).pr;
      // 1 point of tolerance: a traction-limited launch is quantised by gear shifts
      if (pr < prev - 1) { ok = false; notes.push(`${u.id}${L}: ${prev}->${pr}`); }
      prev = pr;
    }
  }
  const maxed = rate(build(c.id, all(3)));
  check(`${c.id}: PR never drops with an upgrade (${stock} stock, ${maxed.pr} maxed, class ${rate(base(c.id)).cls} -> ${maxed.cls})`, ok && maxed.pr > stock + 120, notes.join(' '));
}
check('turbo parts do nothing on naturally aspirated cars', rate(build('civic', { turbo: 3 })).pr === rate(base('civic')).pr, '');
check('class thresholds are ordered and respected', classOf(CLASS_MIN.D) === 'D' && classOf(CLASS_MIN.C) === 'C' && classOf(CLASS_MIN.B - 1) === 'C' && classOf(CLASS_MIN.S) === 'S' && classOf(999) === 'S', '');
check('events restrict by class', allowedInClass('B', 450) && !allowedInClass('C', 520) && allowedInClass('S', 999), '');
check('stock civic is D class, maxed supra is S class', rate(base('civic')).cls === 'D' && rate(build('supra', all(3))).cls === 'S', '');

// stability: random combinations and every slider at its extremes, random driving for 40 s, no NaN, bounded
const rnd = createRng(5);
const drive = (t: CarTuning, seed: number): boolean => {
  const c = new CarController(t);
  c.reset();
  const r = createRng(seed);
  const i = createNeutralInput();
  for (let k = 0; k < 60 * 40; k++) {
    if (k % 20 === 0) { i.throttle = r() < 0.7 ? 1 : 0; i.brake = r() < 0.2 ? 1 : 0; i.steer = r() * 2 - 1; i.handbrake = r() < 0.15; i.nitro = r() < 0.3; }
    c.step(D, i, WEATHER[(['CLEAR', 'RAIN', 'SNOW'] as const)[Math.floor(k / 800) % 3]]);
    const s = c.state;
    if (![s.position.x, s.position.z, s.speed, s.yawRate, s.heading, c.drivetrain.rpm].every(Number.isFinite) || Math.abs(s.speed) > 140 || Math.abs(s.yawRate) > 18) return false;
  }
  return true;
};
let stable = true;
for (let n = 0; n < 120 && stable; n++) {
  const up: Upgrades = {};
  for (const id of UPGRADE_IDS) up[id] = Math.floor(rnd() * 4) as 0 | 1 | 2 | 3;
  const s = defaultSetup();
  for (const k of Object.keys(s) as (keyof Setup)[]) { const [lo, hi] = SETUP_RANGES[k]; s[k] = lo + rnd() * (hi - lo); }
  stable = drive(build(CARS[n % CARS.length].id, up, s), n + 1);
}
check('120 random upgrade + setup combinations stay stable', stable, '');
let extremes = true;
for (const k of Object.keys(defaultSetup()) as (keyof Setup)[]) for (const e of [0, 1]) {
  const s = defaultSetup();
  s[k] = SETUP_RANGES[k][e];
  extremes = extremes && drive(build('supra', all(3), s), 9);
}
check('every slider at both ends, maxed Supra: stable', extremes, '');

// controllable at maximum upgrades
for (const c of CARS) {
  const stockT = base(c.id);
  const maxT = build(c.id, all(3));
  const flick = (t: CarTuning): { peak: number; rec: number } => {
    const car = new CarController(t);
    car.reset();
    const cruise = { ...createNeutralInput(), throttle: 0.6 };
    while (car.state.speed < 25) car.step(D, cruise, WEATHER.CLEAR);
    let peak = 0;
    for (let k = 0; k < 60; k++) { car.step(D, { ...cruise, handbrake: true, steer: 1, throttle: 0.4 }, WEATHER.CLEAR); peak = Math.max(peak, Math.abs(car.state.slipAngle)); }
    let rec = 0;
    while (Math.abs(car.state.slipAngle) > 0.15 && rec < 8) { car.step(D, { ...createNeutralInput(), throttle: 0.3 }, WEATHER.CLEAR); rec += D; }
    return { peak, rec };
  };
  const f = flick(maxT);
  const stop = (t: CarTuning): number => rate(t).brake30;
  check(`${c.id} maxed: drift starts (0.3-1.5 rad), recovers in 5 s, brakes no worse than stock`, f.peak >= 0.3 && f.peak <= 1.5 && f.rec < 5 && stop(maxT) <= stop(stockT) + 0.01, `slip ${f.peak.toFixed(2)}, recover ${f.rec.toFixed(1)} s, brake ${stop(stockT).toFixed(1)} -> ${stop(maxT).toFixed(1)} m`);
}

// dyno
const dc = dynoCurve(build('supra', all(3)));
const ds = dynoCurve(base('supra'));
check('dyno curve is finite, rises with upgrades and peaks inside the rev range', dc.torque.every(Number.isFinite) && dc.peakPower.value > ds.peakPower.value && dc.peakTorque.rpm >= base('supra').idleRpm && dc.rpm.length === 36, `${ds.peakPower.value.toFixed(0)} -> ${dc.peakPower.value.toFixed(0)} hp`);
check('stored upgrades and setups are sanitised', JSON.stringify(sanitizeUpgrades({ engine: 9, ghost: 2, tyres: 'x', brakes: 1.7 })) === '{"brakes":1,"stage":4}' && sanitizeSetup({ finalDrive: 9, diff: -4, steer: 'x' }).finalDrive === 1.15 && sanitizeSetup({ diff: -4 }).diff === 0, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
