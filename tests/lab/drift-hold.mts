// Drift hold probe: at SPEED, tap the handbrake for TAP s with steer left, then keep steer STEER and throttle THR for 3 s.
// A good arcade drift holds a slip of ~15-40 deg while the travel direction keeps turning (the car goes round the corner sideways).
import { CARS } from '../../src/data/cars.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { WEATHER } from '../../src/physics/weather.ts';
import { SteerRamp } from '../../src/input/steerRamp.ts';
const [id = 'civic', sp = '22', tap = '0.3', st = '1', th = '1'] = process.argv.slice(2);
const car = new CarController(applyTuning(createDefaultTuning(), CARS.find((c) => c.id === id)!.tuning));
car.reset(0, 0, 0);
const inp = { throttle: 0.7, brake: 0, steer: 0, handbrake: false, nitro: false };
for (let i = 0; i < 3000 && car.u < +sp; i++) car.step(1 / 60, inp, WEATHER.CLEAR);
const ramp = new SteerRamp(); let line = `${id.padEnd(6)} tap ${tap} steer ${st} thr ${th}:`;
for (let i = 1; i <= 240; i++) {
  const t = i / 60, hb = t < +tap;
  inp.steer = ramp.update(hb ? 1 : +st, car.state.speed * 3.6, 1 / 60); inp.handbrake = hb; inp.throttle = +th;
  car.step(1 / 60, inp, WEATHER.CLEAR);
  if (i % 30 === 0) line += ` ${(Math.atan2(-car.v, Math.abs(car.u)) * 57.3).toFixed(0).padStart(3)}/${(car.state.speed).toFixed(0)}`;
}
console.log(line + '   (slip deg / speed m/s every 0.5 s)');
