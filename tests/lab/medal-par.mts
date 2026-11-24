// Prints the "par" time of every race map: a solo full-skill AI in the RX-7 on a dry road, for the map's own lap count.
// Used once to fill src/data/medals.ts; rerun when a map or the AI changes (tests/medals-check guards the bands).
import { CARS } from '../../src/data/cars.ts';
import { RaceManager } from '../../src/core/raceManager.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { createAIRacer } from '../../src/physics/aiRacers.ts';
import { buildTrack, TRACKS } from '../../src/data/tracks/index.ts';
import { createNeutralInput } from '../../src/types/game.ts';

const D = 1 / 60;
export function parTime(id: string, carId = 'rx7'): number {
  const def = TRACKS.find((t) => t.id === id)!;
  const spec = CARS.find((c) => c.id === carId)!;
  const rm = new RaceManager(buildTrack(def), def.laps);
  rm.addRacer('ai', 'AI', applyTuning(createDefaultTuning(), spec.tuning), createAIRacer('ai', 'AI', 1));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const idle = createNeutralInput();
  let n = 0;
  while (!rm.racers[0].finished && n++ < 60 * 900) rm.step(D, idle, 'CLEAR');
  return rm.racers[0].finished ? rm.racers[0].finishTime : 0;
}
if (process.argv[1]?.endsWith('medal-par.mts')) {
  for (const t of TRACKS) if (t.type !== 'drift') console.log(t.id, t.laps, t.type, parTime(t.id).toFixed(1));
}
