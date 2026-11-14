import { CARS } from '../../src/data/cars.ts';
import type { CarTuning } from '../../src/physics/carTuning.ts';
import { runLaps, WEATHERS } from './laps.mts';
import { scenarios, type Mod } from './scenarios.mts';

/** Global tuning deltas tried by the sweep: absolute values for new fields, multipliers / offsets on per-car data. */
export interface Knobs {
  slideDamp: number; brakeStab: number; slideCap: number; slideGain: number; powerSlide: number; powerFloor: number;
  driftAssistMul: number; yawDampMul: number; brakeBiasAdd: number; hbGripAdd: number; tireC: number; minSteerMul: number; steerFalloff: number; rollFrontAdd: number;
}
export const NEUTRAL: Knobs = { slideDamp: 1.2, brakeStab: 5, slideCap: 0.58, slideGain: 14, powerSlide: 0.72, powerFloor: 0.45, driftAssistMul: 1, yawDampMul: 1, brakeBiasAdd: 0, hbGripAdd: 0, tireC: 1.5, minSteerMul: 1, steerFalloff: 60, rollFrontAdd: 0 };

export const modOf = (k: Knobs): Mod => (t: CarTuning) => {
  t.slideDamp = k.slideDamp; t.brakeStab = k.brakeStab; t.slideCap = k.slideCap; t.slideGain = k.slideGain; t.powerSlide = k.powerSlide; t.powerFloor = k.powerFloor;
  t.driftAssist = Math.min(1, t.driftAssist * k.driftAssistMul); t.yawDamping *= k.yawDampMul; t.brakeBias = Math.min(0.78, t.brakeBias + k.brakeBiasAdd);
  t.handbrakeGrip += k.hbGripAdd; t.tireC = k.tireC; t.minSteerScale *= k.minSteerMul; t.steerFalloffSpeed = k.steerFalloff; t.rollFront += k.rollFrontAdd;
};

export interface Score { j: number; kb: number; clumsy: number; stuck: number; hits: number; pen: number; clean: number; note: string }
const TRACKS = ['kestrel', 'neon', 'cliff', 'maze'];
let cleanBase = 0;

/** Lower is better: keyboard spins per lap, plus a little for clumsy spins, stuck states and wall hits, plus penalties when drifting gets hard, recovery slow or the car slow. */
export function score(mod: Mod | undefined, cars: readonly string[] = CARS.map((c) => c.id), laps = 2): Score {
  let kbS = 0, kbL = 0, clS = 0, clL = 0, stuck = 0, hits = 0, clean = 0;
  for (const car of cars) {
    for (const track of TRACKS) for (const weather of WEATHERS) {
      const a = runLaps({ car, track, weather, bot: 'keyboard', laps, mod });
      const b = runLaps({ car, track, weather, bot: 'clumsy', laps, mod });
      kbS += a.spins; kbL += Math.max(1, a.laps); stuck += a.stuck; hits += a.hits; clS += b.spins; clL += Math.max(1, b.laps);
    }
    clean += runLaps({ car, track: 'kestrel', weather: 'CLEAR', bot: 'clean', laps: 2, mod }).lapMean / cars.length;
  }
  if (!mod && cars.length === CARS.length) cleanBase = clean;
  let pen = 0;
  const why: string[] = [];
  const add = (name: string, v: number): void => { if (v > 0.001) { pen += v / cars.length; why.push(`${name}${v.toFixed(2)}`); } };
  for (const car of cars) {
    const s = scenarios(car, mod);
    const awd = car === 'evo';
    add('start-', Math.max(0, (awd ? 0.35 : 0.45) - s.driftStart) * 4); add('start+', Math.max(0, s.driftStart - 1.0) * 1.5);
    add('hold', Math.max(0, (awd ? 0.3 : 0.7) - s.driftHold) * 1.5);
    add('recT', Math.max(0, s.recoverT - 1.5) * 0.4); add('recMax', Math.max(0, s.recoverMax - 0.9) * 2);
    add('resp', Math.max(0, s.resp80 - 0.18) * 5 + Math.max(0, s.resp120 - 0.2) * 5);
    add('brake', Math.max(0, s.brakeSlip - 0.45)); add('tap', Math.max(0, s.tapShift - 2.4) * 0.3);
    add('hbturn', !awd && s.hbTurn > 12 ? 0.3 : 0);
  }
  if (cleanBase > 0 && cars.length === CARS.length) add('pace', Math.max(0, clean / cleanBase - 1.015) * 20 * cars.length + Math.max(0, 0.975 - clean / cleanBase) * 20 * cars.length);
  const kb = kbS / kbL, clumsy = clS / clL;
  return { j: kb + 0.1 * clumsy + 0.5 * (stuck / kbL) + 0.05 * (hits / kbL) + pen, kb, clumsy, stuck: stuck / kbL, hits: hits / kbL, pen, clean, note: why.join(' ') };
}
export const show = (s: Score): string => `J ${s.j.toFixed(3)} kb ${s.kb.toFixed(2)} clumsy ${s.clumsy.toFixed(2)} stuck ${s.stuck.toFixed(2)} hits ${s.hits.toFixed(2)} pen ${s.pen.toFixed(2)} clean ${s.clean.toFixed(1)}s`;
