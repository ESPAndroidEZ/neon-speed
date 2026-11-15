import { RaceManager } from '../src/core/raceManager.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { CarController } from '../src/physics/carController.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { createSurfaceHit, SurfaceMap } from '../src/physics/surfaces.ts';
import { TrackContact } from '../src/physics/trackContact.ts';
import { envFor, gripFor, LEVELS, type PhysicsLevel } from '../src/physics/weatherLevels.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { Weather } from '../src/types/game.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';
import { layoutProps } from '../src/world/propsLayout.ts';
import { halfWidthAt } from '../src/world/track.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const car = (): CarController => {
  const c = new CarController(createDefaultTuning());
  c.reset();
  return c;
};
const stop = (w: Weather, lv: PhysicsLevel): number => {
  const c = car();
  const gas = createNeutralInput();
  gas.throttle = 1;
  while (c.state.speed < 30) c.step(D, gas, 'CLEAR' === w ? envFor('CLEAR', lv) : envFor('CLEAR', lv));
  const e = envFor(w, lv);
  const z0 = c.state.position.z;
  const b = createNeutralInput();
  b.brake = 1;
  let n = 0;
  while (c.state.speed > 0.3 && n++ < 60 * 40) c.step(D, b, e);
  return Math.abs(c.state.position.z - z0);
};

// grip table and stopping distances
check('grip table: rain 0.72/0.60/0.50, snow 0.45/0.34/0.26', gripFor('RAIN', 'NORMAL') === 0.72 && gripFor('RAIN', 'AGGRESSIVE') === 0.6 && gripFor('RAIN', 'EXTREME') === 0.5 && gripFor('SNOW', 'NORMAL') === 0.45 && gripFor('SNOW', 'AGGRESSIVE') === 0.34 && gripFor('SNOW', 'EXTREME') === 0.26, '');
const dry = stop('CLEAR', 'AGGRESSIVE');
const want: [Weather, PhysicsLevel, number][] = [['RAIN', 'NORMAL', 1 / 0.72], ['RAIN', 'AGGRESSIVE', 1 / 0.6], ['RAIN', 'EXTREME', 1 / 0.5], ['SNOW', 'NORMAL', 1 / 0.45], ['SNOW', 'AGGRESSIVE', 1 / 0.34], ['SNOW', 'EXTREME', 1 / 0.26]];
let prev = 0;
for (const [w, lv, ratio] of want) {
  const d = stop(w, lv);
  const r = d / dry;
  check(`stopping from 30 m/s: ${w} ${lv} is ${ratio.toFixed(2)}x the dry distance (+-12%)`, Math.abs(r / ratio - 1) < 0.12, `${d.toFixed(0)} m = ${r.toFixed(2)}x`);
  if (w === 'SNOW') {
    check(`snow ${lv} stops later than the previous snow level`, d > prev, '');
    prev = d;
  } else prev = 0;
}
check('level ramp: intensity 0 is dry grip, 0.5 halfway', envFor('RAIN', 'AGGRESSIVE', 0).grip === 1 && Math.abs(envFor('RAIN', 'AGGRESSIVE', 0.5).grip - 0.8) < 1e-9, '');
check('snow gets a looser tail at the harder levels', envFor('SNOW', 'EXTREME').yawDampMul < envFor('SNOW', 'AGGRESSIVE').yawDampMul && envFor('SNOW', 'AGGRESSIVE').yawDampMul < envFor('SNOW', 'NORMAL').yawDampMul, '');

// stability: 60 s of random input at every level and weather
for (const lv of LEVELS) {
  let seed = 4242;
  const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const c = car();
  const inp = createNeutralInput();
  let bad = false;
  for (let k = 0; k < 60 * 60; k++) {
    if (k % 20 === 0) {
      inp.throttle = rnd() < 0.7 ? 1 : 0; inp.brake = rnd() < 0.2 ? 1 : 0; inp.steer = rnd() * 2 - 1; inp.handbrake = rnd() < 0.15; inp.nitro = rnd() < 0.3;
    }
    c.step(D, inp, envFor((['RAIN', 'SNOW', 'CLEAR'] as const)[Math.floor(k / 1200) % 3], lv, Math.min(1, k / 1200)));
    const s = c.state;
    if (![s.position.x, s.position.z, s.heading, s.speed, s.yawRate, s.slipAngle, c.drivetrain.rpm, c.drivetrain.boost].every(Number.isFinite) || Math.abs(s.speed) > 120 || Math.abs(s.yawRate) > 15) bad = true;
  }
  check(`${lv}: no NaN or runaway over 60 s of random input`, !bad, '');
}

// a handbrake drift stays recoverable at AGGRESSIVE (and EXTREME) in rain and snow
for (const w of ['RAIN', 'SNOW'] as Weather[]) {
  for (const lv of ['AGGRESSIVE', 'EXTREME'] as PhysicsLevel[]) {
    const c = car();
    const e = envFor(w, lv);
    const n = createNeutralInput();
    n.throttle = 0.5;
    while (c.state.speed < 18) c.step(D, n, e);
    const flick = { ...n, handbrake: true, steer: 1, throttle: 0.3 };
    let peak = 0;
    for (let k = 0; k < 40; k++) {
      c.step(D, flick, e);
      peak = Math.max(peak, Math.abs(c.state.slipAngle));
    }
    // release: ease off the throttle, no steering input: the counter-steer assist must catch it
    const rel = { ...n, throttle: 0 };
    let t = 0;
    while (Math.abs(c.state.slipAngle) > 0.15 && t < 6) {
      c.step(D, rel, e);
      t += D;
    }
    check(`${w} ${lv}: handbrake slide (${peak.toFixed(2)} rad) is caught within 6 s`, t < 6 && peak > 0.1, `${t.toFixed(2)} s`);
  }
}

// surfaces
const track = createKestrelBay();
const sm = new SurfaceMap(track);
const hit = createSurfaceHit();
sm.setConditions('RAIN', 'NORMAL', 1);
check('NORMAL level has no hazards', !sm.hazardsOn, '');
sm.setConditions('RAIN', 'AGGRESSIVE', 1);
check('rain at AGGRESSIVE turns hazards on, ~18 puddles', sm.hazardsOn && sm.puddles.length >= 14 && sm.puddles.length <= 18, `${sm.puddles.length}`);
const p = sm.puddles[0];
sm.query(p.index, p.lateral, p.x, p.z, 25, hit);
check('puddle: grip 55% and steering fades at speed', hit.kind === 'puddle' && hit.grip === 0.55 && hit.steer < 0.6, `${hit.grip}, steer ${hit.steer.toFixed(2)}`);
sm.query(p.index, p.lateral, p.x, p.z, 2, hit);
check('puddle at walking pace keeps steering', hit.steer > 0.95, '');
const s0 = track.samples[p.index];
sm.query(p.index, 0, s0.position.x + 50, s0.position.z + 50, 25, hit);
check('away from a puddle the road is dry', hit.kind === 'dry' && hit.grip === 1, '');
check('no puddles on the start grid', sm.puddles.every((q) => q.index > 8 && q.index < track.samples.length - 26), '');
const a = sm.puddles.map((q) => `${q.index}:${q.r.toFixed(2)}`).join();
sm.reseed(1);
const b = sm.puddles.map((q) => `${q.index}:${q.r.toFixed(2)}`).join();
sm.reseed(99);
const c2 = sm.puddles.map((q) => `${q.index}:${q.r.toFixed(2)}`).join();
check('puddles are deterministic per seed and differ between races', a === b && a !== c2, '');
sm.setConditions('SNOW', 'AGGRESSIVE', 1);
const tun = track.zones.indexOf('tunnel') + 5;
sm.query(tun, 0, 0, 0, 20, hit);
check('snow: ice in the tunnel', hit.kind === 'ice' && hit.grip < 0.6, `${hit.grip}`);
const brg = track.zones.indexOf('bridge') + 5;
sm.query(brg, 0, 0, 0, 20, hit);
check('snow: ice on the bridge', hit.kind === 'ice', '');
const corner = sm.cornerIndex[Math.floor(sm.cornerIndex.length / 2)];
sm.query(corner, halfWidthAt(track, corner) - 0.5, 0, 0, 20, hit); // the road edge (roads were widened 2026-11-15)
check('snow: banks at the edge of tight corners slow the car', hit.kind === 'snowbank' && hit.drag > 0.1, `${hit.kind} drag ${hit.drag}`);
sm.query(corner, 0, 0, 0, 20, hit);
check('snow: the racing line itself is clear', hit.kind === 'dry', hit.kind);

// the surface actually changes the car: tunnel ice vs dry tunnel
{
  const tc = new TrackContact(track);
  tc.surfaces = sm;
  const c = car();
  tc.place(c, tun, 0);
  tc.update(c);
  check('contact applies ice grip to the car', c.surfaceGrip < 0.6, `${c.surfaceGrip}`);
}

// AI at EXTREME in snow (all hazards on) completes laps
{
  const props = layoutProps(track);
  const surf = new SurfaceMap(track);
  const rm = new RaceManager(track, 2, props.obstacles, surf);
  [0.5, 0.9].forEach((s, i) => rm.addRacer(`ai${i}`, `AI ${i}`, applyTuning(createDefaultTuning(), {}), createAIRacer(`ai${i}`, `AI ${i}`, s)));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const env = envFor('SNOW', 'EXTREME');
  surf.setConditions('SNOW', 'EXTREME', 1);
  let steps = 0;
  let wall = 0;
  let bad = false;
  const idle = createNeutralInput();
  while (steps++ < 60 * 900 && !(rm.racers[0].finished && rm.racers[1].finished)) {
    rm.step(D, idle, env);
    for (const r of rm.racers.slice(0, 2)) {
      if (r.contact.impact > 0) wall++;
      if (!Number.isFinite(r.car.state.speed)) bad = true;
    }
  }
  check('AI finishes 2 laps in EXTREME snow with banks and ice', rm.racers[0].finished && rm.racers[1].finished && !bad, `${rm.raceTime.toFixed(0)} s, ${wall} wall steps`);
  check('AI does not abuse the walls in EXTREME snow', wall < 0.05 * steps, `${wall}/${steps}`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
