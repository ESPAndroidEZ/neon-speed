// Handbrake response. (1) release: left flick 0.45 s, then let go (throttle on, wheel straight): seconds until the rear
// grips again (hbFactor > 0.95). (2) switch: left flick, 0.3 s later steer right + pull again: extra yaw toward the
// right that the second pull adds over steering right alone, 0.25 s after the pull (rad/s; bigger = it acts).
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { applyBuild } from '../../src/data/carBuild.ts';
import { CARS } from '../../src/data/cars.ts';
import { envFor } from '../../src/physics/weatherLevels.ts';
import { createNeutralInput } from '../../src/types/game.ts';
const D = 1 / 60, env = envFor('CLEAR', 'AGGRESSIVE');
const run = (id: string, plan: (t: number, i: ReturnType<typeof createNeutralInput>) => void, until: number, probe: (t: number, c: CarController) => void): void => {
  const car = CARS.find((x) => x.id === id)!;
  const tn = applyTuning(createDefaultTuning(), car.tuning); applyBuild(tn, car.id);
  const c = new CarController(tn); c.reset();
  const inp = createNeutralInput(); inp.throttle = 1;
  while (c.u < 22) c.step(D, inp, env);
  for (let t = 0; t < until; t += D) { plan(t, inp); c.step(D, inp, env); probe(t, c); }
};
for (const { id } of CARS) {
  let rel = -1;
  run(id, (t, i) => { i.throttle = t < 0.45 ? 0.7 : 0; i.steer = t < 0.45 ? 0.8 : 0; i.handbrake = t < 0.45; }, 3, (t, c) => { if (rel < 0 && t > 0.45 && c.hbFactor > 0.95) rel = t - 0.45; });
  const yaw = (second: boolean): number => {
    let r = 0;
    run(id, (t, i) => { i.throttle = 0.6; i.steer = t < 0.45 ? 0.8 : -0.8; i.handbrake = t < 0.45 || (second && t >= 0.75 && t < 1.2); }, 1.0, (t, c) => { if (Math.abs(t - 1.0 + D) < D / 2 || t >= 1.0 - D) r = c.r; });
    return r;
  };
  const extra = yaw(false) - yaw(true); // r < 0 = turning right
  console.log(`${id.padEnd(6)} grip back ${rel < 0 ? '>2.5' : rel.toFixed(2)} s after release | second pull adds ${extra.toFixed(2)} rad/s of right turn`);
}
