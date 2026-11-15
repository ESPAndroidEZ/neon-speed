import { CarController } from '/home/carlos/projects/racer-blood/src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '/home/carlos/projects/racer-blood/src/physics/carTuning.ts';
import { HANDLING } from '/home/carlos/projects/racer-blood/src/physics/assists.ts';
import { findCar } from '/home/carlos/projects/racer-blood/src/data/cars.ts';
import { envFor, type PhysicsLevel } from '/home/carlos/projects/racer-blood/src/physics/weatherLevels.ts';
import { createNeutralInput, type Weather } from '/home/carlos/projects/racer-blood/src/types/game.ts';
import { steerAngle } from '/home/carlos/projects/racer-blood/src/physics/legacy/steering.ts';

HANDLING.model = (process.argv[2] ?? 'legacy') as 'legacy' | 'v2';
const D = 1 / 60;
const mk = (id: string): CarController => { const c = new CarController(applyTuning(createDefaultTuning(), findCar(id).tuning)); c.reset(); return c; };
const conds: [string, Weather, PhysicsLevel][] = [['CLEAR', 'CLEAR', 'NORMAL'], ['SNOW-N', 'SNOW', 'NORMAL'], ['SNOW-A', 'SNOW', 'AGGRESSIVE']];
const cars = (process.argv[3] ?? 'civic,350z,supra,evo').split(',');
console.log(`model ${HANDLING.model}`);
console.log('car    cond    0-100s  top30s  | steer: yaw r/kin  ay(g)  R(m)  beta(deg)  [80 km/h]');
for (const id of cars) for (const [lab, w, lv] of conds) {
  const e = envFor(w, lv);
  const c = mk(id); const gas = createNeutralInput(); gas.throttle = 1;
  let t = 0, t100 = NaN;
  for (; t < 30; t += D) { c.step(D, gas, e); if (isNaN(t100) && c.u * 3.6 >= 100) t100 = t; }
  const top = c.u * 3.6;
  const parts: string[] = [];
  for (const st of [0.3, 0.6, 1.0]) {
    const k = mk(id); const inp = createNeutralInput(); inp.throttle = 0.6;
    const vt = 80 / 3.6;
    // get to speed straight
    for (let i = 0; i < 60 * 40 && k.u < vt; i++) k.step(D, inp, e);
    let integ = 0, sr = 0, say = 0, sb = 0, sk = 0, n = 0;
    for (let i = 0; i < 60 * 8; i++) {
      const err = vt - k.u; integ = Math.max(-5, Math.min(5, integ + err * D));
      inp.throttle = Math.max(0, Math.min(1, 0.3 + 0.4 * err + 0.3 * integ)); inp.brake = err < -3 ? 0.3 : 0;
      inp.steer = st; k.step(D, inp, e);
      if (i > 60 * 5) {
        const delta = steerAngle(k.t, k.assist, st, k.u, k.v, 1, 1);
        const wb = k.t.cgToFront + k.t.cgToRear;
        sr += k.r; say += k.r * Math.hypot(k.u, k.v); sb += Math.atan2(k.v, k.u); sk += k.u * Math.tan(delta) / wb; n++;
      }
    }
    const r = sr / n, ay = say / n, kin = sk / n, spd = k.u;
    parts.push(`${st}: ${(r).toFixed(2)}/${kin.toFixed(2)}=${(r / kin).toFixed(2)} ${(ay / 9.81).toFixed(2)}g R${(spd / Math.abs(r)).toFixed(0)} b${(sb / n * 57.3).toFixed(1)} v${(spd * 3.6).toFixed(0)}`);
  }
  console.log(`${id.padEnd(6)} ${lab.padEnd(7)} ${(isNaN(t100) ? '>30' : t100.toFixed(1)).padStart(6)}  ${top.toFixed(0).padStart(5)}  | ${parts.join(' | ')}`);
}
// (c) RWD power oversteer: at 60 km/h, steer 0.6, then full throttle 3 s
console.log('\nRWD/FWD/AWD power-on: 60 km/h steer 0.6, then full throttle 3 s -> peak beta, final r');
for (const id of cars) for (const [lab, w, lv] of conds) {
  const e = envFor(w, lv); const k = mk(id); const inp = createNeutralInput(); inp.throttle = 0.5;
  for (let i = 0; i < 60 * 40 && k.u < 60 / 3.6; i++) k.step(D, inp, e);
  inp.throttle = 0.25; inp.steer = 0.6; for (let i = 0; i < 120; i++) k.step(D, inp, e);
  const r0 = k.r; inp.throttle = 1; let pb = 0;
  for (let i = 0; i < 180; i++) { k.step(D, inp, e); pb = Math.max(pb, Math.abs(Math.atan2(k.v, k.u))); }
  console.log(`${id.padEnd(6)} ${lab.padEnd(7)} r before ${r0.toFixed(2)} after ${k.r.toFixed(2)}  peak beta ${(pb * 57.3).toFixed(1)} deg  v ${(k.u * 3.6).toFixed(0)}  spin=${k.flags.wheelspin}`);
}
