import { RaceManager } from '../src/core/raceManager.ts';
import { MANUAL_SLOTS, parseSnapshot, SAVE_VERSION, SaveSlots, type GameSnapshot } from '../src/core/gameSave.ts';
import type { KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { buildField } from '../src/data/rivals.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { SurfaceMap } from '../src/physics/surfaces.ts';
import { fillEnv, type PhysicsEnv } from '../src/physics/weatherLevels.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { CarInput } from '../src/types/game.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';
import { layoutProps } from '../src/world/propsLayout.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const track = createKestrelBay();
const props = layoutProps(track);

/** A fresh race: player (Supra, turbo + nitro) against two AI, rain ramping in, puddles seeded. */
function build(): { rm: RaceManager; surf: SurfaceMap } {
  const surf = new SurfaceMap(track);
  const rm = new RaceManager(track, 3, props.obstacles, surf);
  for (const f of buildField(['jinx', 'dante'])) rm.addRacer(f.agent.id, f.agent.name, applyTuning(createDefaultTuning(), f.car.tuning), f.agent);
  rm.addRacer('you', 'You', applyTuning(createDefaultTuning(), CARS.find((c) => c.id === 'supra')!.tuning), null, true);
  rm.place(4242);
  rm.begin();
  return { rm, surf };
}
// scripted player: weaving, handbrake flicks, nitro bursts: exercises boost, drift chain and nitro
const script = (k: number, out: CarInput): CarInput => {
  out.throttle = k % 300 < 220 ? 1 : 0.2;
  out.brake = 0;
  out.steer = k % 240 > 130 && k % 240 < 200 ? 0.7 : Math.sin(k / 90) * 0.12;
  out.handbrake = k % 240 > 130 && k % 240 < 200;
  out.nitro = k % 400 > 330;
  return out;
};
const env = (k: number, e: PhysicsEnv): PhysicsEnv => fillEnv(e, 'RAIN', 'AGGRESSIVE', Math.min(1, 0.25 + k / 1200));
const blank = (): PhysicsEnv => fillEnv({ name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level: 'AGGRESSIVE', yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, 'CLEAR', 'AGGRESSIVE');
let maxBoost = 0;
const run = (rm: RaceManager, surf: SurfaceMap, from: number, to: number): void => {
  const inp = createNeutralInput();
  const e = blank();
  for (let k = from; k < to; k++) {
    surf.setConditions('RAIN', 'AGGRESSIVE', Math.min(1, 0.25 + k / 1200));
    rm.step(D, script(k, inp), env(k, e));
    maxBoost = Math.max(maxBoost, rm.player.car.drivetrain.boost);
    if (k % 120 === 0 && process.env.DBG) console.log(k, rm.player.car.state.speed.toFixed(1), rm.player.car.state.slipAngle.toFixed(2), rm.player.contact.impact);
  }
};
/** Everything observable, as a string: exact equality means exact determinism. */
const fingerprint = (rm: RaceManager): string => JSON.stringify(rm.snapshot());

const N = 1500; // 25 s into the race (past the countdown, mid-race)
const M = 1200;
const a = build();
run(a.rm, a.surf, 0, N - 50);
const dr = a.rm.player.car.drift; // a drift chain in progress, so its scoring state is part of the round trip
dr.chain = 777; dr.chainTime = 3.3; dr.bank = 1200; dr.drifting = true;
run(a.rm, a.surf, N - 50, N);
const saved = JSON.parse(JSON.stringify(a.rm.snapshot())); // through JSON, exactly as localStorage would
const seed = a.surf.seed;
check('snapshot is plain JSON (round trips through stringify)', JSON.stringify(saved) === JSON.stringify(a.rm.snapshot()), `${JSON.stringify(saved).length} bytes`);
run(a.rm, a.surf, N, N + M);
const want = fingerprint(a.rm);

const b = build();
b.surf.reseed(seed);
b.rm.restore(saved);
check('restoring reproduces the saved state immediately', JSON.stringify(b.rm.snapshot()) === JSON.stringify(saved), '');
run(b.rm, b.surf, N, N + M);
check(`determinism: restore + ${M} steps == ${M} uninterrupted steps (all racers, boost, nitro, drift, laps, AI)`, fingerprint(b.rm) === want, '');
const sp = b.rm.player.car;
check('the run actually exercised turbo, nitro, drift and the AI', a.rm.player.car.drivetrain.nitroLevel < 1 && a.rm.player.car.drift.bank >= 1200 && maxBoost > 0.3 && a.rm.racers[0].laps.total > 0 && Number.isFinite(sp.state.speed), `max boost ${maxBoost.toFixed(2)}, AI laps ${a.rm.racers[0].laps.total.toFixed(0)}`);

// a mismatched save must be refused, not applied
const c = build();
let threw = false;
try {
  c.rm.restore({ ...saved, racers: saved.racers.slice(1) });
} catch {
  threw = true;
}
check('restoring onto different racers is refused', threw, '');

// ---- storage: slots, validation, migration, corruption
const summary = { eventTitle: 'Dock Sprint', carName: 'Supra', lap: 1, laps: 3, position: 2, racers: 3, weather: 'RAIN', raceTime: 25 };
const snap = (t: number): GameSnapshot => ({ version: SAVE_VERSION, savedAt: t, summary, setup: { carId: 'supra', paint: 1, glow: null, weather: 'RAIN', laps: 3, rivalIds: ['jinx', 'dante'], skillScale: 1, wet: true, eventId: 'dock', weatherChange: null }, race: saved, weather: 'RAIN', weatherIntensity: 1, physicsLevel: 'AGGRESSIVE', surfaceSeed: seed });
const mem = new Map<string, string>();
const kv: KeyValueStore = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
const slots = new SaveSlots(kv);
check('empty storage: no saves', slots.latest() === null && MANUAL_SLOTS === 5, '');
slots.put(1, snap(100));
slots.put('auto', snap(300));
slots.put(0, snap(200));
const again = new SaveSlots(kv);
check('slots persist and the latest save wins (autosave here)', again.get(0)?.savedAt === 200 && again.get(1)?.savedAt === 100 && again.latest()?.id === 'auto', '');
check('the stored race still restores and matches', (() => { const x = build(); x.surf.reseed(again.get(0)!.surfaceSeed); x.rm.restore(again.get(0)!.race as never); return JSON.stringify(x.rm.snapshot()) === JSON.stringify(saved); })(), '');

check('bad data is rejected without throwing', [null, undefined, 5, 'x', [], {}, { version: 1 }, { version: 1, savedAt: 1, summary: {}, setup: {}, race: {} }].every((x) => parseSnapshot(x) === null), '');
check('a save from the future (version 99) is rejected', parseSnapshot({ ...snap(1), version: 99 }) === null, '');
check('an old save with no migration (version 0) is rejected, not guessed at', parseSnapshot({ ...snap(1), version: 0 }) === null, '');
check('a damaged field is rejected (rivalIds not strings)', parseSnapshot({ ...snap(1), setup: { ...snap(1).setup, rivalIds: [1, 2] } }) === null, '');
check('a valid save passes', parseSnapshot(JSON.parse(JSON.stringify(snap(5))))?.savedAt === 5, '');
for (const junk of ['{not json', '[]', '{"slots":5}', 'null', '{"slots":[{"version":1},null,null],"auto":{"version":7}}', '']) {
  mem.set('racers-blood-slots', junk);
  let ok = true;
  try {
    const s = new SaveSlots(kv);
    ok = s.latest() === null;
  } catch {
    ok = false;
  }
  check(`corrupt storage "${junk.slice(0, 22)}" loads as empty, no crash`, ok, '');
}
const broken: KeyValueStore = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
const bs = new SaveSlots(broken);
check('blocked or full storage: put reports failure but keeps the session save', bs.put(0, snap(1)) === false && bs.get(0)?.savedAt === 1, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
