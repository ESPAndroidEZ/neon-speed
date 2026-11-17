// Handbrake hold (owner 2026-11-17): a normal pull is the approved handbrake (unchanged for the first 0.45 s);
// holding it longer fades its effect so the car stops rotating and can be driven out.
import { CarController } from '../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { applyBuild } from '../src/data/carBuild.ts';
import { CARS } from '../src/data/cars.ts';
import { envFor } from '../src/physics/weatherLevels.ts';
import { handbrakeFade } from '../src/physics/legacy/stability.ts';
import { createNeutralInput } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${i}`); };
const D = 1 / 60;
check('fade is 1 for a normal pull (< 0.5 s)', [0, 0.2, 0.45, 0.5].every((s) => handbrakeFade(s) === 1));
check('fade drops to 0.2 on a long hold', Math.abs(handbrakeFade(2) - 0.2) < 1e-9 && handbrakeFade(0.7) < 1 && handbrakeFade(0.7) > 0.2);
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
  inp.handbrake = false;
  for (let i = 0; i < 18; i++) c.step(D, inp, env); // 0.3 s after letting go
  check(`${car.id}: grip is back 0.3 s after releasing a long hold`, c.hbFactor > 0.95, `hb ${c.hbFactor.toFixed(2)}`);
  check(`${car.id}: rear grip comes back during a 3 s hold`, late > 1 - (1 - tn.handbrakeGrip) * 0.25, `hb ${late.toFixed(2)} (pull ${tn.handbrakeGrip})`);
  check(`${car.id}: a 3 s hold at 90 km/h does not spin the car round (< 150 deg)`, rot < Math.PI * 150 / 180, `${(rot * 180 / Math.PI).toFixed(0)} deg`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
