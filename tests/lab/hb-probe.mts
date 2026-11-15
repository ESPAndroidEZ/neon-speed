// Handbrake probe: drive straight at SPEED, then steer + handbrake for HOLD s, then release (keep steer) for 1.5 s.
// Prints heading (deg, + = left), travel direction (deg, + = left), slip angle and forward speed u.
import { CARS } from '../../src/data/cars.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { WEATHER } from '../../src/physics/weather.ts';
const id = process.argv[2] ?? 'civic', steer = Number(process.argv[3] ?? 1), speed = Number(process.argv[4] ?? 20), hold = Number(process.argv[5] ?? 1.5);
const thr = Number(process.argv[6] ?? 0);
const car = new CarController(applyTuning(createDefaultTuning(), CARS.find((c) => c.id === id)!.tuning));
car.reset(0, 0, 0);
const dt = 1 / 60; const deg = (x: number): string => (x * 57.3).toFixed(0).padStart(5);
const inp = { throttle: 0.6, brake: 0, steer: 0, handbrake: false, nitro: false };
for (let i = 0; i < 1200 && car.u < speed; i++) car.step(dt, inp, WEATHER.CLEAR);
for (let i = 0; i < 30; i++) { inp.throttle = 0.3; car.step(dt, inp, WEATHER.CLEAR); }
console.log(`${id} steer=${steer} u0=${car.u.toFixed(1)} hold=${hold}s thr=${thr}`);
console.log('    t  head travel  slip     u     v');
const n = Math.round((hold + 1.5) / dt);
for (let i = 0; i <= n; i++) {
  const tt = i * dt;
  inp.steer = steer; inp.handbrake = tt < hold; inp.throttle = thr;
  car.step(dt, inp, WEATHER.CLEAR);
  if (i % 9 === 0) {
    const s = car.state, h = s.heading, vx = s.velocity.x, vz = s.velocity.z;
    console.log(`${tt.toFixed(2).padStart(5)} ${deg(h)} ${deg(Math.atan2(vx, vz))} ${deg(Math.atan2(car.v, Math.abs(car.u)))} ${car.u.toFixed(1).padStart(5)} ${car.v.toFixed(1).padStart(5)}${tt < hold ? '  HB' : ''}`);
  }
}
