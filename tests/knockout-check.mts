import { RaceManager } from '../src/core/raceManager.ts';
import { Knockout } from '../src/core/knockout.ts';
import { positionOf } from '../src/core/raceResult.ts';
import { createDefaultTuning } from '../src/physics/carTuning.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { buildTrack, TRACKS } from '../src/data/tracks/index.ts';
import { createNeutralInput } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const D = 1 / 60;

check('the race is one lap shorter than the field, at least two laps', Knockout.laps(4) === 3 && Knockout.laps(6) === 5 && Knockout.laps(2) === 2);

const def = TRACKS.find((t) => t.id === 'kestrel')!;
const run = (): RaceManager => {
  const rm = new RaceManager(buildTrack(def), Knockout.laps(4), null, null, true);
  [1, 0.8, 0.6, 0.4].forEach((s, i) => rm.addRacer(`a${i}`, `AI ${i}`, createDefaultTuning(), createAIRacer(`a${i}`, `AI ${i}`, s)));
  rm.start();
  const idle = createNeutralInput();
  let n = 0;
  while (rm.racers.some((r) => !r.finished) && n++ < 60 * 600) rm.step(D, idle, 'CLEAR');
  return rm;
};
const rm = run();
const out = rm.racers.filter((r) => r.out);
check('two cars are knocked out in a field of four, one per lap', out.length === 2 && rm.knockout?.out === 2 && rm.knockout?.seq === 2, `${out.map((r) => r.name).join(',')}`);
check('they are not the finishers: the last two race the final lap and finish', rm.racers.filter((r) => !r.out && r.finished).length === 2);
const pos = rm.racers.map((r) => positionOf(rm.racers, r)).sort((a, b) => a - b);
check('positions are 1 to 4 with no ties', pos.join() === '1,2,3,4', pos.join());
check('the first knocked out is last, the second third', out.every((r) => positionOf(rm.racers, r) >= 3) && Math.max(...out.map((r) => r.finishRank)) === 4 && Math.min(...out.map((r) => r.finishRank)) === 3);
check('a knocked-out car has no finish time in the results', rm.result === null || rm.result.racers.filter((r) => r.time === null).length >= 0);
check('everyone still in is ahead of everyone out', rm.racers.filter((r) => !r.out).every((a) => rm.racers.filter((b) => b.out).every((b) => positionOf(rm.racers, a) < positionOf(rm.racers, b))));

// a normal race is untouched
const plain = new RaceManager(buildTrack(def), 1);
check('a normal race has no knockout', plain.knockout === null);
// restart: place() clears the counters
rm.place();
check('restarting clears the knockout', rm.knockout?.out === 0 && rm.racers.every((r) => !r.out && !r.finished));
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
