import { TRACKS, buildTrack } from '../src/data/tracks/index.ts';
import { RaceManager } from '../src/core/raceManager.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { ObstacleField } from '../src/physics/obstacles.ts';
import { createNeutralInput } from '../src/types/game.ts';
import { halfWidthAt } from '../src/world/track.ts';

/* Every map is drivable by the AI: both skills finish, nobody lives on the walls, and the field never deadlocks. */
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
for (const def of TRACKS) {
  const track = buildTrack(def);
  const laps = def.type === 'sprint' ? 1 : 2;
  const rm = new RaceManager(track, laps, new ObstacleField(track.samples.length));
  [0.5, 1].forEach((s, i) => rm.addRacer(`ai${i}`, `AI ${i}`, applyTuning(createDefaultTuning(), {}), createAIRacer(`ai${i}`, `AI ${i}`, s)));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const idle = createNeutralInput();
  let steps = 0;
  let wall = 0;
  let off = 0;
  const cap = 60 * 700;
  while (steps++ < cap && !(rm.racers[0].finished && rm.racers[1].finished)) {
    rm.step(1 / 60, idle, 'CLEAR');
    for (const r of rm.racers.slice(0, 2)) {
      if (r.finished) continue;
      if (r.contact.impact > 0) wall++;
      if (Math.abs(r.contact.hit.lateral) > halfWidthAt(track, r.contact.hit.index) + 0.3) off++;
    }
  }
  const t = rm.racers.slice(0, 2).map((r) => r.finishTime);
  const dist = track.raceSamples * track.spacing * laps;
  check(`${def.id}: both AIs finish ${laps} lap(s)`, rm.racers[0].finished && rm.racers[1].finished, `${t.map((x) => x.toFixed(0)).join(' / ')} s`);
  check(`${def.id}: average speed is plausible (12-45 m/s)`, t.every((x) => dist / x > 12 && dist / x < 45), `${(dist / t[1]).toFixed(1)} m/s`);
  check(`${def.id}: walls are rare (<3% of steps), little off-tarmac`, wall < steps * 0.03 && off < steps * 0.05, `${wall} wall, ${off} off of ${steps}`);
  check(`${def.id}: the stronger driver is faster`, t[1] <= t[0] + 1, `${t[1].toFixed(0)} vs ${t[0].toFixed(0)}`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
