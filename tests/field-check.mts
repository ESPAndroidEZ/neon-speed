// Competitive free-race field: same tier as the player's car, full skill, the player's upgrade levels.
import { CARS } from '../src/data/cars.ts';
import { aiTuning, carTier, competitiveField } from '../src/data/rivals.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const tiers = CARS.map((c) => `${c.id}:${carTier(c)}`).join(' ');
check('four tiers of two cars each', [0, 1, 2, 3].every((t) => CARS.filter((c) => carTier(c) === t).length === 2), tiers);
for (const c of CARS) {
  const f = competitiveField(5, c, { stage: 2, tyres: 3 });
  const ok = f.length === 5 && f.every((e) => carTier(e.car) === carTier(c) && e.upgrades?.stage === 2 && e.upgrades?.tyres === 3);
  check(`${c.id}: rivals in its tier with its upgrades`, ok, f.map((e) => e.car.id).join(','));
}
const stock = applyTuning(createDefaultTuning(), CARS[0].tuning), up = aiTuning(CARS[0], { stage: 3 });
check('AI upgrades change the AI car', up.engineTorque > stock.engineTorque, `${stock.engineTorque} -> ${up.engineTorque} Nm`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
