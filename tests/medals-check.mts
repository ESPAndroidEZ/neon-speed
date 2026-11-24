import { driftMedal, driftTimes, MEDALS, medalFor, medalRank, medalTimes, PAR } from '../src/core/medals.ts';
import { TRACKS } from '../src/data/tracks/index.ts';
import { parTime } from './lab/medal-par.mts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };

check('every race map has a par and every drift map a target', TRACKS.every((t) => (t.type === 'drift' ? (t.driftTarget ?? 0) > 0 : PAR[t.id] > 0)), TRACKS.filter((t) => t.type !== 'drift' && !PAR[t.id]).map((t) => t.id).join());
const m = medalTimes('kestrel', 'CLEAR')!;
check('gold is quicker than silver, silver than bronze', m.gold < m.silver && m.silver < m.bronze, `${m.gold}/${m.silver}/${m.bronze}`);
check('wet roads get more time', medalTimes('kestrel', 'RAIN')!.gold > m.gold && medalTimes('kestrel', 'SNOW')!.gold > medalTimes('kestrel', 'RAIN')!.gold);
check('times earn the right medal at the edges', medalFor('kestrel', 'CLEAR', m.gold) === 'gold' && medalFor('kestrel', 'CLEAR', m.gold + 1) === 'silver' && medalFor('kestrel', 'CLEAR', m.silver + 1) === 'bronze' && medalFor('kestrel', 'CLEAR', m.bronze + 1) === null);
check('no time, a bad time or a map without a par earns nothing', medalFor('kestrel', 'CLEAR', undefined) === null && medalFor('kestrel', 'CLEAR', 0) === null && medalFor('city-downtown', 'CLEAR', 50) === null);
check('medal ranks order gold > silver > bronze > none', medalRank('gold') > medalRank('silver') && medalRank('silver') > medalRank('bronze') && medalRank('bronze') > medalRank(null));
const d = driftTimes(8000);
check('drift medals: the target is bronze, 1.5x silver, 2x gold', d.bronze === 8000 && d.silver === 12000 && d.gold === 16000 && driftMedal(8000, 7999) === null && driftMedal(8000, 8000) === 'bronze' && driftMedal(8000, 12000) === 'silver' && driftMedal(8000, 99999) === 'gold' && driftMedal(undefined, 5) === null);
check('three medals', MEDALS.length === 3);
// regression guard: the par of the quickest map still matches the AI (the measurement behind src/core/medals.ts)
const sim = parTime('cliff');
check('the cliff sprint par still matches a full-skill AI (within 6 %)', Math.abs(sim - PAR.cliff) / PAR.cliff < 0.06, `${sim.toFixed(1)} vs ${PAR.cliff}`);
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
