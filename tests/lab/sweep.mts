import { appendFileSync, writeFileSync } from 'node:fs';
import { modOf, NEUTRAL, score, show, type Knobs } from './score.mts';

/* Coordinate descent over the global handling knobs. npx tsx tests/lab/sweep.mts [rounds]. Log: logs/handling/sweep.log */
const GRID: Record<keyof Knobs, number[]> = {
  brakeStab: [0, 2, 4, 7], brakeBiasAdd: [0, 0.04, 0.08, 0.12], slideGain: [0, 4, 8, 14], slideCap: [0.5, 0.6, 0.7, 0.85], slideDamp: [0, 0.6, 1.2, 2.2],
  powerSlide: [0.45, 0.58, 0.72], powerFloor: [0.45, 0.55, 0.65], driftAssistMul: [1, 1.3, 1.6], yawDampMul: [0.85, 1, 1.25, 1.5], hbGripAdd: [-0.05, 0, 0.1, 0.2],
  tireC: [1.35, 1.42, 1.5, 1.58], minSteerMul: [0.75, 0.88, 1], steerFalloff: [45, 52, 60, 70], rollFrontAdd: [-0.04, 0, 0.04, 0.08],
};
const LOG = 'logs/handling/sweep.log';
const say = (s: string): void => { appendFileSync(LOG, s + '\n'); };
writeFileSync(LOG, '');
const base = score(undefined);
say(`baseline ${show(base)} | ${base.note}`);
const best: Knobs = { ...NEUTRAL };
let bestS = score(modOf(best));
for (let round = 0; round < Number(process.argv[2] ?? 2); round++) {
  for (const key of Object.keys(GRID) as (keyof Knobs)[]) {
    for (const v of GRID[key]) {
      if (v === best[key]) continue;
      const s = score(modOf({ ...best, [key]: v }));
      if (s.j < bestS.j - 0.004) { bestS = s; best[key] = v; say(`  + ${key}=${v} ${show(s)} | ${s.note}`); }
    }
    say(`r${round} ${key} -> ${best[key]}  ${show(bestS)}`);
  }
}
say(`BEST ${JSON.stringify(best)}\n${show(bestS)} | ${bestS.note}`);
