import { CARS } from '../src/data/cars.ts';
import { aiTuning } from '../src/data/rivals.ts';
import { RaceManager } from '../src/core/raceManager.ts';
import { applyTuning, createDefaultTuning, type CarTuning } from '../src/physics/carTuning.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { applyStyle, STYLE, streetTuning } from '../src/physics/drivingStyle.ts';
import { chaseStyle } from '../src/camera/cameraStyle.ts';
import { createChaseTuning } from '../src/camera/chaseCam.ts';
import { KEY_RAMP, SteerRamp } from '../src/input/steerRamp.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';
import { createNeutralInput } from '../src/types/game.ts';
import { measure, type Feel } from './lab/feel.mts';

/* Driving style: Classic is the approved handling bit for bit (numbers measured on 2026-11-25 at the backup tag
   driving-backup-2026-11-25, tests/lab/feel.mts); Street is grippier, sharper and has a stronger nitro, keeps the
   handbrake working and stays inside the balance bands. */
let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const base = (id: string): CarTuning => applyTuning(createDefaultTuning(), CARS.find((c) => c.id === id)!.tuning);

// [t100 s, R60 m, R100 m, hb slip deg, hb turn deg, nitro km/h] from the backup tag
const CLASSIC: Record<string, number[]> = {
  civic: [6.83, 17.2, 33.7, 34, 112, 13.4], golf: [7.87, 23.3, 39.8, 36, 113, 10.3], '350z': [5.6, 30.4, 76.3, 28, 83, 14.2],
  rx7: [5.18, 28.7, 72.6, 26, 88, 15.0], e61: [6.63, 25.6, 62.6, 29, 97, 9.8], m3: [5.17, 25.2, 60.3, 33, 98, 18.7],
  evo: [5.2, 23.7, 62.6, 27, 100, 14.4], supra: [4.78, 23.8, 18.3, 36, 103, 12.0],
};
const row = (f: Feel): number[] => [f.t100, f.r60, f.r100, f.hbSlip * 57.3, f.hbTurn * 57.3, f.nitroGain];
const TOL = [0.011, 0.051, 0.051, 0.51, 0.51, 0.051];

for (const c of CARS) {
  const t = base(c.id), u = base(c.id);
  applyStyle(u, 'CLASSIC');
  check(`${c.id}: Classic leaves the tuning untouched`, JSON.stringify(t) === JSON.stringify(u));
  const cl = measure(c.id), st = measure(c.id, streetTuning), want = CLASSIC[c.id], got = row(cl);
  check(`${c.id}: Classic feel equals the backup numbers`, got.every((v, i) => Math.abs(v - want[i]) < TOL[i]), got.map((v) => v.toFixed(2)).join(' '));
  check(`${c.id}: Street turns tighter at 60 km/h`, st.r60 < cl.r60 * 0.97, `${cl.r60.toFixed(1)} -> ${st.r60.toFixed(1)} m`);
  check(`${c.id}: Street holds a full-lock 100 km/h turn (slip < 20 deg)`, st.slip100 < 0.35, `${(st.slip100 * 57.3).toFixed(0)} deg`);
  check(`${c.id}: Street nitro pushes harder`, st.nitroGain > cl.nitroGain * 1.2, `+${cl.nitroGain.toFixed(1)} -> +${st.nitroGain.toFixed(1)} km/h`);
  check(`${c.id}: Street launch not slower`, st.t100 <= cl.t100 + 0.01, `${cl.t100.toFixed(2)} -> ${st.t100.toFixed(2)} s`);
  check(`${c.id}: Street handbrake still swings the car (slip within 6 deg, turn not less)`, Math.abs(st.hbSlip - cl.hbSlip) < 0.105 && st.hbTurn >= cl.hbTurn, `${(st.hbSlip * 57.3).toFixed(0)} deg, ${(st.hbTurn * 57.3).toFixed(0)} deg`);
  if (c.id === '350z' || c.id === 'rx7') check(`${c.id}: Street power slide starts easier on the gas`, st.powerSlip > cl.powerSlip * 1.2, `${(cl.powerSlip * 57.3).toFixed(0)} -> ${(st.powerSlip * 57.3).toFixed(0)} deg`);
}

// rivals never get the Street multipliers (aiTuning does not go through applyBuild)
const aiClassic = CARS.map((c) => JSON.stringify(aiTuning(c))).join();
STYLE.id = 'STREET';
check('AI tuning ignores the player style', CARS.map((c) => JSON.stringify(aiTuning(c))).join() === aiClassic);
STYLE.id = 'CLASSIC';

// player steering ramp: Classic = the old keyboard ramp exactly; Street is quicker at speed
const a = new SteerRamp(), b = new SteerRamp(KEY_RAMP, true);
let same = true;
for (let i = 0; i < 60; i++) same &&= a.update(i < 30 ? 1 : -1, 150, 1 / 60) === b.update(i < 30 ? 1 : -1, 150, 1 / 60);
check('Classic player ramp = the old keyboard ramp', same);
STYLE.id = 'STREET';
const c2 = new SteerRamp(KEY_RAMP, true), d2 = new SteerRamp();
for (let i = 0; i < 6; i++) { c2.update(1, 150, 1 / 60); d2.update(1, 150, 1 / 60); }
check('Street player ramp reaches lock sooner at 150 km/h', c2.value > d2.value * 1.15, `${d2.value.toFixed(2)} -> ${c2.value.toFixed(2)}`);
STYLE.id = 'CLASSIC';

// camera: Classic = defaults, Street = closer and lower at speed, bigger nitro kick
const cam = createChaseTuning(), def = createChaseTuning();
chaseStyle(cam, 'STREET');
check('Street camera closer and lower at speed', cam.distanceFast < def.distanceFast && cam.heightFast < def.heightFast && cam.nitroKick > def.nitroKick);
chaseStyle(cam, 'CLASSIC');
check('Classic camera = the defaults again', JSON.stringify(cam) === JSON.stringify(def));

// balance: the full-skill bot in a Street-tuned car stays inside the balance bands (tests/balance-check), at most 3 s faster
const BANDS: Record<string, [number, number]> = { civic: [61, 69], golf: [60.5, 68.5], '350z': [59, 67], rx7: [56.5, 64.5], e61: [57, 65], m3: [56, 64], evo: [55, 63], supra: [53.5, 61.5] };
const track = createKestrelBay();
for (const c of CARS) {
  const tu = base(c.id); streetTuning(tu);
  const rm = new RaceManager(track, 2);
  rm.addRacer('ai', 'AI', tu, createAIRacer('ai', 'AI', 1));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const idle = createNeutralInput();
  let n = 0;
  while (!rm.racers[0].finished && n++ < 60 * 400) rm.step(1 / 60, idle, 'CLEAR');
  const lap = rm.racers[0].finished ? rm.racers[0].finishTime / 2 : 999, [lo, hi] = BANDS[c.id];
  check(`${c.id}: Street bot lap within ${lo - 3}-${hi} s`, lap >= lo - 3 && lap <= hi, `${lap.toFixed(1)} s`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
