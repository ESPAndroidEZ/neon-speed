import { CarController } from '/home/carlos/projects/racer-blood/src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '/home/carlos/projects/racer-blood/src/physics/carTuning.ts';
import { findCar } from '/home/carlos/projects/racer-blood/src/data/cars.ts';
import { envFor } from '/home/carlos/projects/racer-blood/src/physics/weatherLevels.ts';
import { createNeutralInput } from '/home/carlos/projects/racer-blood/src/types/game.ts';
const D = 1 / 60;
for (const id of ['civic', '350z', 'evo']) for (const gr of [1, 0.58, 0.45]) {
  const e = { ...envFor('SNOW', 'NORMAL'), grip: gr };
  const c = new CarController(applyTuning(createDefaultTuning(), findCar(id).tuning)); c.reset();
  const g = createNeutralInput(); g.throttle = 1; let t = 0;
  while (c.u * 3.6 < 100 && t < 30) { c.step(D, g, e); t += D; }
  const k = new CarController(applyTuning(createDefaultTuning(), findCar(id).tuning)); k.reset();
  const inp = createNeutralInput(); inp.throttle = 0.6; while (k.u < 80 / 3.6) k.step(D, inp, e);
  let integ = 0, ay = 0, n = 0;
  for (let i = 0; i < 60 * 6; i++) { const err = 80 / 3.6 - k.u; integ = Math.max(-5, Math.min(5, integ + err * D)); inp.throttle = Math.max(0, Math.min(1, 0.3 + 0.4 * err + 0.3 * integ)); inp.steer = 0.5; k.step(D, inp, e); if (i > 240) { ay += k.r * k.u; n++; } }
  console.log(id, 'grip', gr, '0-100', t.toFixed(1), 'ay80', (ay / n / 9.81).toFixed(2));
}
