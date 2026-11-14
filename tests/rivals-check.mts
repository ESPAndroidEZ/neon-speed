import { CARS } from '../src/data/cars.ts';
import { buildField, freeRaceField, RIVALS } from '../src/data/rivals.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
check('every rival uses a real car id', RIVALS.every((r) => CARS.some((c) => c.id === r.carId)), '');
check('unique ids and names', new Set(RIVALS.map((r) => r.id)).size === RIVALS.length && new Set(RIVALS.map((r) => r.name)).size === RIVALS.length, '');
check('skills in 0..1, Dante is the strongest', RIVALS.every((r) => r.skill >= 0 && r.skill <= 1) && RIVALS.every((r) => r.skill <= RIVALS.find((x) => x.id === 'dante')!.skill), '');
const f = freeRaceField(4);
check('free race field has 4 distinct rivals', f.length === 4 && new Set(f.map((e) => e.agent.id)).size === 4, f.map((e) => e.agent.name).join(', '));
check('time trial field is empty', freeRaceField(0).length === 0, '');
check('field skills ascend (weakest first)', f.every((e, i) => i === 0 || e.agent.skill >= f[i - 1].agent.skill), f.map((e) => e.agent.skill.toFixed(2)).join(' '));
check('skill scale applies and clamps', buildField(['dante'], 2)[0].agent.skill === 1 && buildField(['tank'], 0.5)[0].agent.skill < 0.12, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
