import { CARS } from '../../src/data/cars.ts';
import { modOf, NEUTRAL, score, show, type Knobs } from './score.mts';
import { scenarios, type Scen } from './scenarios.mts';
/* npx tsx tests/lab/try.mts '{"slideGain":8}' : score + skid-pad table for one knob set (on top of the current defaults). */
const k: Knobs = { ...NEUTRAL, ...JSON.parse(process.argv[2] ?? '{}') };
const mod = process.argv[2] ? modOf(k) : undefined;
score(undefined);
const s = score(mod);
console.log(show(s), '|', s.note);
const keys = Object.keys(scenarios('civic')) as (keyof Scen)[];
console.log('car    ' + keys.map((x) => x.padStart(10)).join(''));
for (const c of CARS) { const r = scenarios(c.id, mod); console.log(c.id.padEnd(7) + keys.map((x) => r[x].toFixed(2).padStart(10)).join('')); }
