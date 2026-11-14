import { RaceManager } from '../src/core/raceManager.ts';
import { createDefaultTuning, applyTuning } from '../src/physics/carTuning.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { ObstacleField } from '../src/physics/obstacles.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';
import { layoutProps } from '../src/world/propsLayout.ts';
import { halfWidthAt } from '../src/world/track.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { Weather } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const track = createKestrelBay();
const props = layoutProps(track);
const SKILLS = [0.2, 0.5, 0.8, 1.0];

interface Outcome { finished: number; offFrac: number[]; wallSteps: number[]; nan: boolean; times: number[]; time: number; positions: number[] }

function race(weather: Weather, laps: number, skills: number[], obstacles: ObstacleField | null): Outcome {
  const rm = new RaceManager(track, laps, obstacles);
  skills.forEach((s, i) => rm.addRacer(`rival${i}`, `Rival ${i}`, applyTuning(createDefaultTuning(), {}), createAIRacer(`rival${i}`, `Rival ${i}`, s)));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true); // parked player: never touches the controls
  rm.start();
  const idle = createNeutralInput();
  const off = skills.map(() => 0);
  const wall = skills.map(() => 0);
  let steps = 0;
  let nan = false;
  while (steps++ < 60 * 600 && rm.racers.filter((r) => !r.isPlayer).some((r) => !r.finished)) {
    rm.step(D, idle, weather);
    if (rm.phase === 'COUNTDOWN') continue;
    skills.forEach((_, i) => {
      const r = rm.racers[i];
      if (r.finished) return;
      if (Math.abs(r.contact.hit.lateral) > halfWidthAt(track, r.contact.hit.index) + 0.3) off[i]++;
      if (r.contact.impact > 0) wall[i]++;
      if (!Number.isFinite(r.car.state.position.x) || !Number.isFinite(r.car.state.speed)) nan = true;
    });
  }
  const ais = rm.racers.filter((r) => !r.isPlayer);
  return { finished: ais.filter((r) => r.finished).length, offFrac: off.map((o) => o / steps), wallSteps: wall, nan, times: ais.map((r) => r.finishTime), time: rm.raceTime, positions: ais.map((r) => rm.positionOf(r)) };
}

for (const w of ['CLEAR', 'RAIN', 'SNOW'] as Weather[]) {
  const o = race(w, 3, SKILLS, props.obstacles);
  console.log(`   ${w}: times ${o.times.map((t) => t.toFixed(0)).join(' ')} s, off-tarmac ${o.offFrac.map((f) => (f * 100).toFixed(1)).join('% ')}%, wall steps ${o.wallSteps.join(' ')}`);
  check(`${w}: all 4 AI finish 3 laps`, o.finished === 4 && !o.nan, `${o.finished}/4 in ${o.time.toFixed(0)} s`);
  check(`${w}: nobody spends >5% off the tarmac`, o.offFrac.every((f) => f < 0.05), `${Math.max(...o.offFrac).toFixed(3)}`);
  check(`${w}: wall contact is rare (<3% of steps)`, o.wallSteps.every((s) => s < 0.03 * 60 * o.time), `${Math.max(...o.wallSteps)} steps`);
  if (w === 'CLEAR') {
    check('CLEAR: higher skill finishes sooner', o.times[3] < o.times[0], `${o.times[3].toFixed(0)} s vs ${o.times[0].toFixed(0)} s`);
    check('CLEAR: lap time is street-race fast (< 80 s per lap for the best)', o.times[3] / 3 < 80, `${(o.times[3] / 3).toFixed(1)} s`);
  } else {
    const dry = race('CLEAR', 3, [1.0], props.obstacles);
    check(`${w}: slower than dry, grip is felt`, o.times[3] > dry.times[0] * 1.05, `${o.times[3].toFixed(0)} s vs ${dry.times[0].toFixed(0)} s`);
  }
}
// weather change mid-race (the finale: rain turning to snow) must not crash the driver
{
  const rm = new RaceManager(track, 2, props.obstacles);
  rm.addRacer('a', 'A', createDefaultTuning(), createAIRacer('a', 'A', 0.9));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  let k = 0;
  let wall = 0;
  while (rm.phase !== 'FINISHED' && !rm.racers[0].finished && k++ < 60 * 400) {
    rm.step(D, createNeutralInput(), rm.raceTime > 40 ? 'SNOW' : 'RAIN');
    if (rm.racers[0].contact.impact > 0) wall++;
  }
  check('rain turning to snow: finishes without wall abuse', rm.racers[0].finished && wall < 120, `${wall} wall steps, ${rm.racers[0].finishTime.toFixed(0)} s`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
