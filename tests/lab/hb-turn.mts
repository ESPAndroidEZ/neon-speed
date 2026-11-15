// Does the handbrake tighten the turn? Travel-direction change and lateral displacement after T s, steer only vs steer + handbrake.
import { CARS } from '../../src/data/cars.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { WEATHER } from '../../src/physics/weather.ts';
import { SteerRamp } from '../../src/input/steerRamp.ts';
const id = process.argv[2] ?? 'civic', speed = Number(process.argv[3] ?? 20), hbHold = Number(process.argv[4] ?? 0.6), thr = Number(process.argv[5] ?? 1);
function run(hb: boolean): string {
  const car = new CarController(applyTuning(createDefaultTuning(), CARS.find((c) => c.id === id)!.tuning));
  car.reset(0, 0, 0);
  const inp = { throttle: 0.7, brake: 0, steer: 0, handbrake: false, nitro: false };
  for (let i = 0; i < 2000 && car.u < speed; i++) car.step(1 / 60, inp, WEATHER.CLEAR);
  const ramp = new SteerRamp(); const x0 = car.state.position.x, z0 = car.state.position.z;
  let out = '';
  for (let i = 1; i <= 150; i++) {
    const t = i / 60;
    inp.steer = ramp.update(1, car.state.speed * 3.6, 1 / 60); inp.handbrake = hb && t < hbHold; inp.throttle = thr;
    car.step(1 / 60, inp, WEATHER.CLEAR);
    if (i % 30 === 0) { const s = car.state; out += ` t${t.toFixed(1)}: trav ${(Math.atan2(s.velocity.x, s.velocity.z) * 57.3).toFixed(0)} head ${(s.heading * 57.3).toFixed(0)} x ${(s.position.x - x0).toFixed(1)} spd ${(s.speed).toFixed(0)} |`; }
  }
  return out;
}
console.log(`${id} ${speed} m/s, hb ${hbHold}s, thr ${thr}`);
console.log('steer only :' + run(false));
console.log('steer + HB :' + run(true));
