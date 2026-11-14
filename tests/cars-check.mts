import { CARS } from '../src/data/cars.ts';
import { CarController } from '../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createNeutralInput } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const res: { id: string; t100: number; top: number; slip: number }[] = [];
for (const spec of CARS) {
  const c = new CarController(applyTuning(createDefaultTuning(), spec.tuning));
  c.reset();
  const i = createNeutralInput();
  i.throttle = 1;
  let t = 0;
  while (c.state.speed * 3.6 < 100 && t < 20) {
    c.step(D, i, WEATHER.CLEAR);
    t += D;
  }
  for (let k = 0; k < 60 * 70; k++) c.step(D, i, WEATHER.CLEAR);
  const top = c.state.speed * 3.6;
  // handbrake flick at ~25 m/s
  const h = new CarController(applyTuning(createDefaultTuning(), spec.tuning));
  h.reset();
  const n = createNeutralInput();
  n.throttle = 0.6;
  while (h.state.speed < 25) h.step(D, n, WEATHER.CLEAR);
  const f = { ...n, handbrake: true, steer: 1, throttle: 0.4 };
  let peak = 0;
  for (let k = 0; k < 60; k++) {
    h.step(D, f, WEATHER.CLEAR);
    peak = Math.max(peak, Math.abs(h.state.slipAngle));
  }
  res.push({ id: spec.id, t100: t, top, slip: peak });
  console.log(`${spec.id}: 0-100 ${t.toFixed(2)}s  top ${top.toFixed(0)} km/h  flick slip ${peak.toFixed(2)}`);
}
const by = (id: string) => res.find((r) => r.id === id)!;
const civic = by('civic');
const z = by('350z');
const supra = by('supra');
const evo = by('evo');
const rx7 = by('rx7');
check('five cars', CARS.length === 5, `${CARS.length}`);
check('civic 0-100 6.2-8 s', civic.t100 > 6.2 && civic.t100 < 8, civic.t100.toFixed(2));
check('350Z 0-100 5.0-6.0 s', z.t100 > 5 && z.t100 < 6, z.t100.toFixed(2));
check('rx7 0-100 4.8-5.8 s', rx7.t100 > 4.8 && rx7.t100 < 5.8, rx7.t100.toFixed(2));
check('evo 0-100 4.2-5.2 s', evo.t100 > 4.2 && evo.t100 < 5.2, evo.t100.toFixed(2));
check('supra 0-100 3.8-4.8 s', supra.t100 > 3.8 && supra.t100 < 4.8, supra.t100.toFixed(2));
check('civic is the slowest top speed, supra the fastest', res.every((r) => r.top >= civic.top) && res.every((r) => r.top <= supra.top), res.map((r) => r.top.toFixed(0)).join(' '));
check('top speeds sane (190-295)', res.every((r) => r.top > 190 && r.top <= 295), '');
check('all cars can start a drift (0.3-1.4 rad)', res.every((r) => r.slip >= 0.3 && r.slip <= 1.4), res.map((r) => r.slip.toFixed(2)).join(' '));
check('evo has the most rear grip, civic the least', CARS.find((c) => c.id === 'evo')!.tuning.gripRear! >= Math.max(...CARS.map((c) => c.tuning.gripRear ?? 1.25)) && CARS[0].tuning.gripRear! <= Math.min(...CARS.map((c) => c.tuning.gripRear ?? 1.25)), '');
check('prices ascend, starter free', CARS[0].price === 0 && CARS.every((c, i) => i === 0 || c.price > CARS[i - 1].price), '');
check('unique ids', new Set(CARS.map((c) => c.id)).size === CARS.length, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
