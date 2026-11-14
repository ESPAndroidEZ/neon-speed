import { CARS } from '../src/data/cars.ts';
import { resolveCarPair } from '../src/physics/carCollision.ts';
import { CarController } from '../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { TrackContact } from '../src/physics/trackContact.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createNeutralInput } from '../src/types/game.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';
import { layoutProps } from '../src/world/propsLayout.ts';
import { curvatureAt } from '../src/world/track.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const mk = (id: string): CarController => new CarController(applyTuning(createDefaultTuning(), CARS.find((c) => c.id === id)!.tuning));

// Mass based: head-on, equal and opposite speed. The light car loses more speed than the heavy one.
{
  const light = mk('civic');
  const heavy = mk('supra');
  light.reset(0, 0, 0);
  heavy.reset(0, 3.2, Math.PI);
  light.nudge(0, 0, 0, 12, 0);
  heavy.nudge(0, 0, 0, -12, 0);
  const l0 = light.state.velocity.z;
  const h0 = heavy.state.velocity.z;
  const imp = resolveCarPair(light, heavy);
  const dl = Math.abs(light.state.velocity.z - l0);
  const dh = Math.abs(heavy.state.velocity.z - h0);
  check('head-on closing speed reported', imp > 15, `${imp.toFixed(1)} m/s`);
  check('lighter car takes the bigger speed change', dl > dh * 1.15, `civic ${dl.toFixed(1)} vs supra ${dh.toFixed(1)}`);
  check('momentum is conserved within 10 %', Math.abs((1180 * dl) - (1500 * dh)) < 0.1 * 1180 * dl, `${(1180 * dl).toFixed(0)} vs ${(1500 * dh).toFixed(0)}`);
}

// Side rub: two cars alongside, the faster one is slowed and the slower sped up a little; nobody explodes.
{
  const a = mk('350z');
  const b = mk('350z');
  a.reset(0, 0, 0);
  b.reset(1.9, 0, 0); // overlapping flanks
  a.nudge(0, 0, 0, 25, 0);
  b.nudge(0, 0, 0, 20, 0);
  const sa0 = a.state.velocity.z;
  const sb0 = b.state.velocity.z;
  for (let i = 0; i < 20; i++) {
    resolveCarPair(a, b);
    a.step(1 / 60, createNeutralInput(), WEATHER.CLEAR);
    b.step(1 / 60, createNeutralInput(), WEATHER.CLEAR);
  }
  const gap = Math.abs(a.state.position.x - b.state.position.x);
  check('side contact pushes the cars apart', gap >= 1.99, `${gap.toFixed(2)} m`);
  check('speeds stay sane after a rub', Math.abs(a.state.speed - sa0) < 6 && Math.abs(b.state.speed - sb0) < 6, `${a.state.speed.toFixed(1)} ${b.state.speed.toFixed(1)}`);
}

// Soft bump: a rival-rival hit (strength .12) changes speed far less than a crash.
{
  const mkPair = (): [CarController, CarController] => {
    const a = mk('evo');
    const b = mk('evo');
    a.reset(0, 0, 0);
    b.reset(0, 3.2, Math.PI);
    a.nudge(0, 0, 0, 10, 0);
    b.nudge(0, 0, 0, -10, 0);
    return [a, b];
  };
  const [a1, b1] = mkPair();
  resolveCarPair(a1, b1, 1);
  const [a2, b2] = mkPair();
  resolveCarPair(a2, b2, 0.12);
  check('soft bump is much gentler than a crash', Math.abs(a2.state.velocity.z - 10) < 0.3 * Math.abs(a1.state.velocity.z - 10), `${a2.state.velocity.z.toFixed(1)} vs ${a1.state.velocity.z.toFixed(1)}`);
}

// No sticking: a car that clips a barrier at a shallow angle keeps rolling along it with the throttle held.
{
  const track = createKestrelBay();
  const props = layoutProps(track);
  const n = track.samples.length;
  let idx = 0;
  for (let i = 0; i < n && idx === 0; i++) {
    let clear = true;
    for (let k = 0; k < 30 && clear; k++) clear = Math.abs(curvatureAt(track, (i + k) % n)) < 0.0008 && !(props.obstacles.near((i + k) % n)?.length);
    if (clear) idx = i + 2;
  }
  check('found a clear straight for the wall test', idx > 0, `index ${idx}`);
  const s = track.samples[idx];
  for (const side of [1, -1]) {
    const car = mk('civic');
    const tc = new TrackContact(track);
    const wall = track.wall[idx];
    const x = s.position.x + s.tangent.z * side * (wall - 1.3);
    const z = s.position.z - s.tangent.x * side * (wall - 1.3);
    const along = Math.atan2(s.tangent.x, s.tangent.z);
    const h = along + side * 0.3; // nose angled into the wall
    car.reset(x, z, h);
    tc.hit.index = idx;
    car.nudge(0, 0, Math.sin(h) * 8, Math.cos(h) * 8, 0);
    const input = createNeutralInput();
    input.throttle = 1;
    let rub = 0;
    let pinned = 0;
    for (let i = 0; i < 60 * 5; i++) {
      car.step(1 / 60, input, WEATHER.CLEAR);
      tc.update(car);
      if (tc.scrape > 1) rub++;
      if (i > 120 && Math.abs(car.state.speed) < 1.5) pinned++;
    }
    check(`side ${side > 0 ? 'left' : 'right'}: rubs the wall without sticking`, pinned === 0 && car.state.speed > 8, `speed ${car.state.speed.toFixed(1)}, rubbed ${rub} steps`);
  }
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
