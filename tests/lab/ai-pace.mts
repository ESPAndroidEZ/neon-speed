// Real AI (createAIRacer, full skill) lap time per track: npx tsx tests/lab/ai-pace.mts [car] [tracks...]
import { CARS } from '../../src/data/cars.ts';
import { TRACKS, buildTrack } from '../../src/data/tracks/index.ts';
import { RaceManager } from '../../src/core/raceManager.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { createAIRacer } from '../../src/physics/aiRacers.ts';
import { createNeutralInput } from '../../src/types/game.ts';
const [car = 'civic', ...ids] = process.argv.slice(2);
const spec = CARS.find((c) => c.id === car)!;
for (const def of TRACKS.filter((t) => !ids.length || ids.includes(t.id))) {
  const rm = new RaceManager(buildTrack(def), 2);
  rm.addRacer('ai', 'AI', applyTuning(createDefaultTuning(), spec.tuning), createAIRacer('ai', 'AI', 1));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const idle = createNeutralInput();
  let n = 0, hb = 0, wall = 0;
  while (!rm.racers[0].finished && n++ < 60 * 600) { rm.step(1 / 60, idle, 'CLEAR'); if (rm.racers[0].input.handbrake) hb++; if (rm.racers[0].contact.impact > 1) wall++; }
  const r = rm.racers[0];
  console.log(`${def.id.padEnd(11)} ${car}: ${r.finished ? (r.finishTime / 2).toFixed(1) + ' s/lap' : 'DNF'}  handbrake ${(hb / 60).toFixed(1)} s  wall steps ${wall}`);
}
