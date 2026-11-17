// Handbrake hold (owner 2026-11-17): a normal pull is the approved handbrake (unchanged for the first 0.45 s);
// holding it longer fades its effect so the car stops rotating and can be driven out.
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { applyBuild } from '../../src/data/carBuild.ts';
import { CARS } from '../../src/data/cars.ts';
import { envFor } from '../../src/physics/weatherLevels.ts';
import { createNeutralInput } from '../../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${i}`); };
const D = 1 / 60;
for (const car of CARS) {
  const tn = applyTuning(createDefaultTuning(), car.tuning); applyBuild(tn, car.id);
  const c = new CarController(tn); c.reset();
  const inp = createNeutralInput(), env = envFor('CLEAR', 'AGGRESSIVE');
  inp.throttle = 1;
  while (c.u < 25) c.step(D, inp, env);
  inp.throttle = 0.4; inp.steer = 0.6; inp.handbrake = true;
  let rot = 0;
  for (let i = 0; i < 180; i++) { const h0 = c.state.heading; c.step(D, inp, env); rot += Math.abs(Math.atan2(Math.sin(c.state.heading - h0), Math.cos(c.state.heading - h0))); }
  const late = c.hbFactor;
  
  check(`${car.id}: a 3 s hold at 90 km/h does not spin the car round (< 270 deg)`, rot < 1.5 * Math.PI, `${(rot * 180 / Math.PI).toFixed(0)} deg`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
