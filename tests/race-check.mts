import { RaceManager } from '../src/core/raceManager.ts';
import { resolveCarPair } from '../src/physics/carCollision.ts';
import { CarController } from '../src/physics/carController.ts';
import { createDefaultTuning } from '../src/physics/carTuning.ts';
import { createHarborLoop } from '../src/world/harborLoop.ts';
import { curvatureAt } from '../src/world/track.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { AIRacerAgent, CarInput, CarState, AIWorldView } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const track = createHarborLoop();
const N = track.samples.length;
const D = 1 / 60;
const curv = Array.from({ length: N }, (_, i) => Math.abs(curvatureAt(track, i)));

/** Minimal pure-pursuit pilot, test-only: stands in for the real AI (Qwen task 002). */
const pilot = (skill: number): AIRacerAgent => {
  const out = createNeutralInput();
  let hint = -1;
  return {
    id: `p${skill}`, name: `Pilot ${skill}`, skill,
    decide(_dt: number, s: CarState, w: AIWorldView): CarInput {
      let best = 0;
      let bd = Infinity;
      for (let k = 0; k < N; k++) {
        const i = hint < 0 ? k : (hint - 10 + k + N) % N;
        if (hint >= 0 && k > 30) break;
        const d = Math.hypot(w.track[i].position.x - s.position.x, w.track[i].position.z - s.position.z);
        if (d < bd) { bd = d; best = i; }
      }
      hint = best;
      const look = Math.round((6 + Math.abs(s.speed) * 0.3) / track.spacing);
      const t = w.track[(best + look) % N].position;
      let err = Math.atan2(t.x - s.position.x, t.z - s.position.z) - s.heading;
      err = Math.atan2(Math.sin(err), Math.cos(err));
      out.steer = Math.max(-1, Math.min(1, err * 2.4));
      let kmax = 0;
      for (let k = 0; k < 45; k++) kmax = Math.max(kmax, curv[(best + k) % N]);
      const vt = Math.min(75, Math.sqrt((8 + 4 * skill) / Math.max(kmax, 1e-4)));
      out.throttle = Math.max(0, Math.min(1, (vt - s.speed) * 0.4));
      out.brake = s.speed > vt + 1.5 ? Math.min(1, (s.speed - vt) * 0.3) : 0;
      return out;
    },
  };
};
const none = createNeutralInput();

// --- Time trial, zero AI
{
  const rm = new RaceManager(track, 3);
  const p = rm.addRacer('me', 'You', createDefaultTuning(), pilot(0.6), true);
  rm.start();
  const gas = { ...none, throttle: 1 };
  // the player is driven by the pilot through a wrapper: feed its decision as player input
  const wrap = pilot(0.6);
  const world: AIWorldView = { track: track.samples, racers: [p.car.state], playerIndex: 0 };
  const gx = p.car.state.position.x;
  const gz = p.car.state.position.z;
  let moved = 0;
  for (let i = 0; i < 60 * 2; i++) rm.step(D, gas, 'CLEAR');
  moved = Math.hypot(p.car.state.position.x - gx, p.car.state.position.z - gz);
  check('player locked during countdown', rm.phase === 'COUNTDOWN' && moved < 1, `moved ${moved.toFixed(2)} m, banner "${rm.banner}"`);
  let steps = 0;
  while (rm.phase !== 'FINISHED' && steps++ < 60 * 400) rm.step(D, wrap.decide(D, p.car.state, world), 'CLEAR');
  check('time trial finishes 3 laps', rm.phase === 'FINISHED' && !!rm.result, `${rm.raceTime.toFixed(1)} s, laps ${p.laps.laps}`);
  check('single racer is P1 with cash', rm.result?.position === 1 && (rm.result?.cash ?? 0) > 0, `cash ${rm.result?.cash}`);
  check('best lap recorded & plausible', p.bestLap > 20 && p.bestLap < 90, `${p.bestLap.toFixed(1)} s`);
  check('lap time sums to total', Math.abs(rm.result!.totalTime - rm.raceTime) < 0.1, `${rm.result?.totalTime.toFixed(1)}`);
}

// --- Race vs 3 pilots
{
  const rm = new RaceManager(track, 2);
  const skills = [0.3, 0.6, 0.9];
  for (const s of skills) rm.addRacer(`ai${s}`, `AI ${s}`, createDefaultTuning(), pilot(s));
  const me = rm.addRacer('me', 'You', createDefaultTuning(), null, true);
  const myPilot = pilot(0.5);
  const myView: AIWorldView = { track: track.samples, racers: rm.racers.map((r) => r.car.state), playerIndex: 3 };
  rm.start();
  let bad = false;
  let impacts = 0;
  let steps = 0;
  while (rm.phase !== 'FINISHED' && steps++ < 60 * 400) {
    rm.step(D, myPilot.decide(D, me.car.state, myView), 'CLEAR');
    if (rm.carImpact > 0) impacts++;
    for (const r of rm.racers) if (!Number.isFinite(r.car.state.speed) || !Number.isFinite(r.car.state.position.x)) bad = true;
  }
  const ai = rm.racers.filter((r) => !r.isPlayer);
  console.log('   positions:', rm.racers.map((r) => `${r.name}=P${rm.positionOf(r)}`).join(' '), `race ${rm.raceTime.toFixed(0)} s, impacts ${impacts}`);
  check('mixed race stable (no NaN)', !bad, '');
  const positions = rm.racers.map((r) => rm.positionOf(r)).sort();
  check('positions are a permutation', positions.every((p, i) => p === i + 1), positions.join(','));
  check('result lists everyone with the player', rm.result?.racers.length === 4 && rm.result.racers.some((r) => r.isPlayer), '');
  const solo = (skill: number): number => {
    const m = new RaceManager(track, 1);
    const r = m.addRacer('s', 's', createDefaultTuning(), pilot(skill), true);
    const pl = pilot(skill);
    const v: AIWorldView = { track: track.samples, racers: [r.car.state], playerIndex: 0 };
    m.start();
    let k = 0;
    while (m.phase !== 'FINISHED' && k++ < 60 * 200) m.step(D, pl.decide(D, r.car.state, v), 'CLEAR');
    return m.raceTime;
  };
  const slow = solo(0.3);
  const fast = solo(0.9);
  check('pilot pace scales with skill (solo laps)', fast < slow - 3, `${fast.toFixed(1)} s vs ${slow.toFixed(1)} s`);
  void me;
}

// --- Car-car collision separates overlapping cars and swaps closing speed
{
  const a = new CarController(createDefaultTuning());
  const b = new CarController(createDefaultTuning());
  a.reset(0, 0, 0);
  b.reset(0, 3.5, 0);
  a.nudge(0, 0, 0, 20, 0); // a drives at b at 20 m/s (world +z)
  let hit = 0;
  for (let i = 0; i < 30; i++) {
    hit = Math.max(hit, resolveCarPair(a, b));
    a.step(D, createNeutralInput(), { name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0.4 });
    b.step(D, createNeutralInput(), { name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0.4 });
  }
  const gap = b.state.position.z - a.state.position.z;
  check('collision detected', hit > 5, `closing ${hit.toFixed(1)} m/s`);
  check('cars separate after contact', gap > 3.5 && b.state.speed > 0 && Number.isFinite(a.state.speed), `gap ${gap.toFixed(2)}, b speed ${b.state.speed.toFixed(1)}`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
