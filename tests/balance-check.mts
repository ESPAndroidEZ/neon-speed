import { CARS } from '../src/data/cars.ts';
import { RaceManager } from '../src/core/raceManager.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { Weather } from '../src/types/game.ts';

/* Per-car balance on the test circuit (Kestrel Bay, solo AI at full skill): lap-time band and class order. */
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const track = createKestrelBay();

export function lapTime(carId: string, weather: Weather): number {
  const spec = CARS.find((c) => c.id === carId)!;
  const rm = new RaceManager(track, 2);
  rm.addRacer('ai', 'AI', applyTuning(createDefaultTuning(), spec.tuning), createAIRacer('ai', 'AI', 1));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const idle = createNeutralInput();
  let n = 0;
  while (!rm.racers[0].finished && n++ < 60 * 400) rm.step(D, idle, weather);
  return rm.racers[0].finished ? rm.racers[0].finishTime / 2 : 999;
}

const BANDS: Record<string, [number, number]> = { civic: [79, 89], '350z': [76, 86], rx7: [74, 83], evo: [69, 78], supra: [68, 77] };
const times: Record<string, number> = {};
for (const c of CARS) {
  times[c.id] = lapTime(c.id, 'CLEAR');
  const [lo, hi] = BANDS[c.id];
  check(`${c.id} lap in ${lo}-${hi} s`, times[c.id] >= lo && times[c.id] <= hi, `${times[c.id].toFixed(1)} s`);
}
const order = CARS.map((c) => times[c.id]);
check('faster cars in higher classes (each car at least as fast as the one below it)', order.every((t, i) => i === 0 || t <= order[i - 1] + 0.3), order.map((t) => t.toFixed(1)).join(' '));
check('civic is the slowest, a full 3 s behind supra', times.civic > times.supra + 3, `${(times.civic - times.supra).toFixed(1)} s`);
const wet = lapTime('evo', 'RAIN');
check('rain is slower than dry for the same car', wet > times.evo * 1.08, `${times.evo.toFixed(1)} -> ${wet.toFixed(1)}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
