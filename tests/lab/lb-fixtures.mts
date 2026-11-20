/* Real AI laps on every lap-board map, recorded with the game's own LapFrames, plus faked variants: input for
 * tests/lab/scores-php.mjs (the PHP plausibility check run on the server CLI). Writes OUT (default logs/lb-fixtures.json). */
import { writeFileSync } from 'node:fs';
import { TRACKS, buildTrack } from '../../src/data/tracks/index.ts';
import { RaceManager } from '../../src/core/raceManager.ts';
import { createAIRacer } from '../../src/physics/aiRacers.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { ObstacleField } from '../../src/physics/obstacles.ts';
import { createNeutralInput } from '../../src/types/game.ts';
import { LapFrames, bestLapOf } from '../../src/game/lapFrames.ts';

export interface Fixture { name: string; track: string; ms: number; f: number[]; ok: boolean }

export function lbFixtures(): Fixture[] {
  const out: Fixture[] = [];
  for (const def of TRACKS) {
    if (def.type === 'drift') continue;
    const track = buildTrack(def);
    const laps = def.type === 'sprint' ? 1 : 2;
    const rm = new RaceManager(track, laps, new ObstacleField(track.samples.length));
    rm.addRacer('ai', 'AI', applyTuning(createDefaultTuning(), {}), createAIRacer('ai', 'AI', 1));
    rm.addRacer('you', 'You', createDefaultTuning(), null, true);
    rm.start();
    const rec = new LapFrames(), idle = createNeutralInput(), r = rm.racers[0];
    let steps = 0;
    while (!r.finished && steps++ < 60 * 700) {
      rm.step(1 / 60, idle, 'CLEAR');
      if (rm.phase === 'RACING' || r.finished) rec.record(rm.raceTime, r.car.state.position.x, r.car.state.position.y, r.car.state.position.z, r.car.state.heading);
    }
    for (let i = 0; i < r.lapTimes.length; i++) { // every lap: lap 1 starts on the grid, lap 2 at the line
      const start = r.lapTimes.slice(0, i).reduce((a, b) => a + b, 0);
      const ms = Math.round(r.lapTimes[i] * 1000);
      out.push({ name: `${def.id} lap ${i + 1}`, track: def.id, ms, f: rec.slice(start, start + r.lapTimes[i]), ok: true });
    }
    const b = bestLapOf(r.lapTimes);
    const f = rec.slice(b.start, b.start + r.lapTimes[b.index]);
    const ms = Math.round(r.lapTimes[b.index] * 1000);
    out.push({ name: `${def.id} time cut by 20 %`, track: def.id, ms: Math.round(ms * 0.8), f, ok: false });
    const n = f.length / 4, a = Math.floor(n * 0.4) * 4, z = Math.floor(n * 0.6) * 4; // drop 20 % of the frames: a teleport
    out.push({ name: `${def.id} teleport (frames and time cut)`, track: def.id, ms: Math.round(ms * 0.8), f: [...f.slice(0, a), ...f.slice(z)], ok: false });
    const slow = f.map((v, i) => (i % 4 === 3 ? v : v * 0.5)); // a lap on a half-size map: misses the checkpoints
    out.push({ name: `${def.id} shrunk path`, track: def.id, ms, f: slow, ok: false });
    const back: number[] = []; // the same lap driven backwards: right length, right time, wrong checkpoint order
    for (let i = n - 1; i >= 0; i--) back.push(f[i * 4], f[i * 4 + 1], f[i * 4 + 2], f[i * 4 + 3]);
    out.push({ name: `${def.id} driven backwards`, track: def.id, ms, f: back, ok: false });
  }
  return out;
}

if (process.argv[1]?.endsWith('lb-fixtures.mts')) {
  const fx = lbFixtures();
  writeFileSync(process.env.OUT ?? 'logs/lb-fixtures.json', JSON.stringify(fx));
  console.log(`${fx.length} fixtures: ${fx.map((x) => `${x.name} ${(x.ms / 1000).toFixed(1)} s ${x.f.length / 4} frames`).join('; ')}`);
}
