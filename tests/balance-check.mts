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

// 2026-11-15 owner decision: cars are FULLY REAL (data/carReal), so lap times no longer follow price. Bands = measured
// AI laps +-4 s (regression guards); realism itself is checked in tests/cars-check (0-100 and top speed vs the real car).
const BANDS: Record<string, [number, number]> = { civic: [55, 63], golf: [56.5, 64.5], '350z': [56, 64], rx7: [53.5, 61.5], e61: [54.5, 62.5], m3: [50, 58], evo: [53.5, 61.5], supra: [55, 63] };
const times: Record<string, number> = {};
for (const c of CARS) {
  times[c.id] = lapTime(c.id, 'CLEAR');
  const [lo, hi] = BANDS[c.id];
  check(`${c.id} lap in ${lo}-${hi} s`, times[c.id] >= lo && times[c.id] <= hi, `${times[c.id].toFixed(1)} s`);
}
const order = CARS.map((c) => times[c.id]);
const med = [...order].sort((a, b) => a - b)[Math.floor(order.length / 2)];
check('no car is hopeless on the test circuit (each within 6 s of the median)', order.every((t) => Math.abs(t - med) < 6), `median ${med.toFixed(1)} s`);
const wet = lapTime('evo', 'RAIN');
check('rain is slower than dry for the same car', wet > times.evo * 1.08, `${times.evo.toFixed(1)} -> ${wet.toFixed(1)}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
