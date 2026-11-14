import { RaceManager } from '../src/core/raceManager.ts';
import { TRACKS, buildTrack } from '../src/data/tracks/index.ts';
import { buildField } from '../src/data/rivals.ts';
import { DIFFICULTIES, LEVELS, RUBBER_MAX, type Difficulty } from '../src/physics/aiDifficulty.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { ObstacleField } from '../src/physics/obstacles.ts';
import { SurfaceMap } from '../src/physics/surfaces.ts';
import { envFor } from '../src/physics/weatherLevels.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { Weather } from '../src/types/game.ts';

/* Difficulty levels: lap-time bands against the reference lap, a capped rubber band, determinism, no deadlocks, snow. */
let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const kestrel = buildTrack(TRACKS[0]);
const solo = (level: Difficulty, skill: number, id = 'ai'): number => {
  const rm = new RaceManager(kestrel, 2);
  rm.addRacer(id, 'AI', createDefaultTuning(), createAIRacer(id, 'AI', skill, { level }));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const idle = createNeutralInput();
  let n = 0;
  while (!rm.racers[0].finished && n++ < 60 * 400) rm.step(1 / 60, idle, 'CLEAR');
  return rm.racers[0].finishTime / 2;
};

// Reference lap: a Street-level skill-0.7 driver on Kestrel Bay. Bands are fractions of it.
const REF = solo('STREET', 0.7);
const BANDS: Record<Difficulty, [number, number]> = { ROOKIE: [1.05, 1.16], STREET: [0.99, 1.01], PRO: [0.95, 1.0], LEGEND: [0.92, 0.99] };
const lap: Record<string, number> = {};
for (const lv of DIFFICULTIES) {
  lap[lv] = solo(lv, 0.7);
  const [lo, hi] = BANDS[lv];
  check(`${lv}: lap ${lo}-${hi} x reference`, lap[lv] / REF >= lo && lap[lv] / REF <= hi, `${lap[lv].toFixed(1)} s, ${(lap[lv] / REF).toFixed(3)}x of ${REF.toFixed(1)} s`);
}
check('each level is faster than the one below', lap.ROOKIE > lap.STREET && lap.STREET > lap.PRO && lap.PRO > lap.LEGEND, DIFFICULTIES.map((l) => lap[l].toFixed(1)).join(' > '));

// the rubber band is documented, capped, and shrinks with the level (Legend has none)
check('rubber band never exceeds the cap and shrinks with the level', DIFFICULTIES.every((l) => LEVELS[l].rubber <= RUBBER_MAX) && LEVELS.ROOKIE.rubber > LEVELS.STREET.rubber && LEVELS.STREET.rubber > LEVELS.PRO.rubber && LEVELS.LEGEND.rubber === 0, `cap ${RUBBER_MAX}`);

// determinism: the same id and seed drive the same race
check('same driver, same lap time, bit for bit', solo('PRO', 0.8, 'dante') === solo('PRO', 0.8, 'dante'), '');

// full fields: nobody deadlocks, everyone finishes, on every map and level, with real rival personalities
function field(trackId: string, level: Difficulty, weather: Weather, hard: boolean): { finished: number; total: number; lifts: number; time: number } {
  const def = TRACKS.find((t) => t.id === trackId)!;
  const track = buildTrack(def);
  const surf = hard ? new SurfaceMap(track) : null;
  const rm = new RaceManager(track, def.type === 'sprint' ? 1 : 2, new ObstacleField(track.samples.length), surf);
  const ids = ['pixel', 'lola', 'rook', 'tank', 'vex', 'jinx', 'brick', 'nova'];
  buildField(ids, 1, weather !== 'CLEAR', level).forEach((f, i) => rm.addRacer(`ai${i}`, f.agent.name, applyTuning(createDefaultTuning(), f.car.tuning), f.agent));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const env = hard ? envFor(weather as 'RAIN' | 'SNOW', 'EXTREME') : weather;
  if (surf) surf.setConditions(weather, 'EXTREME', 1);
  const idle = createNeutralInput();
  let steps = 0;
  let lifts = 0; // times a rival was pinned for 9 s and lifted back onto the road
  const prev = rm.racers.map(() => 0);
  while (steps++ < 60 * 1200 && !rm.racers.slice(0, ids.length).every((r) => r.finished)) {
    rm.step(1 / 60, idle, env);
    rm.racers.forEach((r, k) => {
      if (r.stuck < prev[k] - 5) lifts++;
      prev[k] = r.stuck;
    });
  }
  return { finished: rm.racers.slice(0, ids.length).filter((r) => r.finished).length, total: ids.length, lifts, time: steps / 60 };
}
for (const level of DIFFICULTIES) {
  for (const id of ['kestrel', 'maze', 'cliff']) {
    const r = field(id, level, 'CLEAR', false);
    check(`${level} on ${id}: all ${r.total} rivals finish, at most 8 pins lifted`, r.finished === r.total && r.lifts <= 8, `${r.finished}/${r.total} in ${r.time.toFixed(0)} s, ${r.lifts} lifts`);
  }
}
for (const level of ['ROOKIE', 'LEGEND'] as const) {
  const r = field('kestrel', level, 'SNOW', true);
  check(`${level}: the whole field finishes in EXTREME snow`, r.finished === r.total, `${r.finished}/${r.total} in ${r.time.toFixed(0)} s, ${r.lifts} lifts`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
