import { CarController } from '../src/physics/carController.ts';
import { createDefaultTuning } from '../src/physics/carTuning.ts';
import { TrackContact } from '../src/physics/trackContact.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';
import { layoutProps } from '../src/world/propsLayout.ts';
import { createNeutralInput } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const track = createKestrelBay();
const car = new CarController(createDefaultTuning());
const tc = new TrackContact(track);
tc.place(car, 10);
const inp = createNeutralInput();

// Full throttle with a gentle steer into the wall: must never leave the barrier corridor and must lose speed.
inp.throttle = 1;
inp.steer = -0.3; // right, outside the 'left' turn
let maxLat = 0;
let hits = 0;
let bad = false;
let peak = 0;
for (let i = 0; i < 60 * 40; i++) {
  car.step(1 / 60, inp, WEATHER.CLEAR);
  tc.update(car);
  if (tc.impact > 0) hits++;
  maxLat = Math.max(maxLat, Math.abs(tc.hit.lateral));
  peak = Math.max(peak, car.state.speed);
  if (!Number.isFinite(car.state.position.x) || !Number.isFinite(car.state.speed)) bad = true;
}
check('stays inside barriers', maxLat < track.wall[tc.hit.index] + 0.6 && !bad, `max lateral ${maxLat.toFixed(2)} m`);
check('wall hits detected', hits > 0, `${hits} steps`);

// Head-on wall impact scrubs speed and breaks the drift chain.
{
  const tg = track.samples[10].tangent;
  car.reset(track.samples[10].position.x + tg.z * (track.wall[10] - 3.2), track.samples[10].position.z - tg.x * (track.wall[10] - 3.2), Math.atan2(tg.z, -tg.x));
  tc.hit.index = 10;
  car.drift.chain = 500;
  inp.throttle = 1;
  inp.steer = 0;
  let peakV = 0;
  let sawImpact = 0;
  for (let i = 0; i < 120; i++) {
    car.step(1 / 60, inp, WEATHER.CLEAR);
    tc.update(car);
    peakV = Math.max(peakV, car.state.speed);
    sawImpact = Math.max(sawImpact, tc.impact);
  }
  check('head-on impact detected and chain lost', sawImpact > 3 && car.drift.chain === 0, `impact ${sawImpact.toFixed(1)} m/s`);
  check('speed scrubbed by wall', car.state.speed < peakV * 0.8, `${peakV.toFixed(1)} -> ${car.state.speed.toFixed(1)}`);
}

// Parked cars: driving into one is a hit, and the car never ends up inside it.
{
  const L = layoutProps(track);
  tc.obstacles = L.obstacles;
  const pc = L.parked[0];
  const s = track.samples[pc.index];
  const back = pc.index - 8;
  tc.place(car, back, pc.side * (track.samples[pc.index].width / 2 - 0.5));
  car.reset(car.state.position.x, car.state.position.z, Math.atan2(s.tangent.x, s.tangent.z));
  let hit = 0;
  let minD = 1e9;
  inp.throttle = 1;
  inp.steer = 0;
  for (let i = 0; i < 240; i++) {
    car.step(1 / 60, inp, WEATHER.CLEAR);
    tc.update(car);
    hit = Math.max(hit, tc.impact);
    for (const o of L.obstacles.near(tc.hit.index)) minD = Math.min(minD, Math.hypot(car.state.position.x - o.x, car.state.position.z - o.z) - o.r);
  }
  check('parked car is solid', hit > 2, `impact ${hit.toFixed(1)} m/s`);
  check('car is never inside a parked car', minD > 0.3, `closest centre-to-surface ${minD.toFixed(2)} m`);
  tc.obstacles = null;
}

// Verge reduces grip, tarmac restores it.
tc.place(car, 30, track.samples[30].width / 2 + 0.5);
car.step(1 / 60, inp, WEATHER.CLEAR);
tc.update(car);
check('verge flagged offroad', tc.offroad && car.surfaceGrip < 1, `grip ${car.surfaceGrip}`);
tc.place(car, 30, 0);
tc.update(car);
check('tarmac full grip', !tc.offroad && car.surfaceGrip === 1, '');

// Reset-to-track puts the car back on the centre line.
tc.place(car, tc.nearestIndex(car));
check('place on centre', Math.abs(tc.hit.lateral) < 3.1 && car.state.speed === 0, `idx ${tc.hit.index}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
