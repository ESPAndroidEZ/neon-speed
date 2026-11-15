import { CARS } from '../src/data/cars.ts';
import { CarController } from '../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { EV_BACKFIRE, EV_CUT, EV_LIFT, EV_UPSHIFT, EventChannel } from '../src/physics/driveEvents.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createNeutralInput } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const car = (id: string): CarController => {
  const spec = CARS.find((c) => c.id === id)!;
  const c = new CarController(applyTuning(createDefaultTuning(), spec.tuning));
  c.reset();
  return c;
};

// event channel
const ch = new EventChannel();
for (let i = 0; i < 40; i++) ch.push(1, i);
let got = 0;
ch.drain(() => got++);
check('event ring keeps the newest 31 and drains once', got === 31, `${got}`);
check('drained channel is empty', (() => { let n = 0; ch.drain(() => n++); return n === 0; })(), '');

for (const id of ['supra', 'evo', 'rx7', 'civic', '350z']) {
  const turbo = CARS.find((c) => c.id === id)!.sound.turbo !== 'none';
  const c = car(id);
  const gas = createNeutralInput();
  gas.throttle = 1;
  const evs: number[] = [];
  const vals: number[] = [];
  let peak = 0;
  let boostAt1s = 0;
  for (let k = 0; k < 60 * 40; k++) { // 40 s: real gearing (data/carReal) needs longer to reach the limiter
    c.step(D, gas, WEATHER.CLEAR);
    c.drivetrain.events.drain((t, v) => { evs.push(t); vals.push(v); });
    peak = Math.max(peak, c.drivetrain.boost);
    if (k === 60) boostAt1s = c.drivetrain.boost;
  }
  const ups = evs.filter((e) => e === EV_UPSHIFT).length;
  if (turbo) {
    check(`${id}: boost builds with a lag (not instant) and reaches > 0.8`, peak > 0.8 && boostAt1s < peak && peak <= 1, `1 s ${boostAt1s.toFixed(2)}, peak ${peak.toFixed(2)}`);
    // lift off
    const lift = createNeutralInput();
    const before = c.drivetrain.boost;
    let after = before;
    for (let k = 0; k < 20; k++) {
      c.step(D, lift, WEATHER.CLEAR);
      c.drivetrain.events.drain((t, v) => { evs.push(t); vals.push(v); });
      after = c.drivetrain.boost;
    }
    const liftIdx = evs.lastIndexOf(EV_LIFT);
    check(`${id}: boost falls fast on lift and a blow-off event carries the boost`, after < before * 0.4 && liftIdx >= 0 && vals[liftIdx] > 0.5, `${before.toFixed(2)} -> ${after.toFixed(2)}, event ${vals[liftIdx]?.toFixed(2)}`);
  } else {
    check(`${id}: naturally aspirated, no boost`, peak === 0, `${peak}`);
  }
  check(`${id}: every upshift is announced`, ups >= 2 && ups === c.drivetrain.gear - 1, `${ups} upshifts, gear ${c.drivetrain.gear}`);
  if (id === 'supra') check('shifts at speed also fire backfire pops, redline fires a cut', evs.includes(EV_BACKFIRE) && evs.includes(EV_CUT), '');
}
// boost adds torque: same car with turbo disabled accelerates slower
{
  const a = car('supra');
  const t2 = applyTuning(createDefaultTuning(), { ...CARS.find((c) => c.id === 'supra')!.tuning, turboTorque: 0 });
  const b = new CarController(t2);
  b.reset();
  const gas = createNeutralInput();
  gas.throttle = 1;
  for (let k = 0; k < 60 * 6; k++) { a.step(D, gas, WEATHER.CLEAR); b.step(D, gas, WEATHER.CLEAR); }
  check('turbo adds speed', a.state.speed > b.state.speed + 1, `${(a.state.speed * 3.6).toFixed(0)} vs ${(b.state.speed * 3.6).toFixed(0)} km/h`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
