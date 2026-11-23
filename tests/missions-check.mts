/* Free Drive missions: data is valid, the runner offers by district, runs the clock, pays once, fails on time-out. */
import { MissionRunner } from '../src/core/missions.ts';
import { MISSIONS } from '../src/data/world/missions.ts';
import { EN } from '../src/i18n/en.ts';
import { ES } from '../src/i18n/es.ts';
import { DISTRICTS } from '../src/types/world.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const ids = new Set(MISSIONS.map((m) => m.id));
check('mission ids are unique', ids.size === MISSIONS.length);
check('every trigger names a real district', MISSIONS.every((m) => 'district' in m.trigger && DISTRICTS.includes(m.trigger.district)));
check('every reward has a flag and cash', MISSIONS.every((m) => m.reward.cash > 0 && !!m.reward.flag));
const E = EN as Record<string, string>, S = ES as Record<string, string>;
check('English and Spanish text for every mission', MISSIONS.every((m) => [E, S].every((d) => d[`mission.${m.id}`] && d[`mission.${m.id}.b`])));

const spot = { x: 500, z: 0 };
const run = new MissionRunner(MISSIONS, [], () => spot);
let ev = run.step(0.1, 0, 0, 'downtown');
check('no offer during the first seconds', ev === 'none');
for (let i = 0; i < 200; i++) ev = run.step(0.1, 0, 0, 'downtown') === 'offer' ? 'offer' : ev;
check('downtown offers its mission', run.state === 'offered' && run.current?.id === 'courier-strip');
run.step(0.1, 0, 0, 'harbour');
check('leaving the district withdraws the offer', run.state === 'idle');
for (let i = 0; i < 50; i++) run.step(0.1, 0, 0, 'downtown');
check('accept starts the clock', run.accept() && run.state === 'active' && run.left === 150);
check('late: fails', (() => { let e = 'none'; for (let i = 0; i < 1600 && e !== 'fail'; i++) e = run.step(0.1, 0, 0, 'downtown'); return e === 'fail' && run.state === 'idle'; })());
for (let i = 0; i < 700; i++) run.step(0.1, 0, 0, 'downtown');
run.accept();
check('arriving wins', run.step(0.1, spot.x, spot.z, 'downtown') === 'win' && run.isDone(MISSIONS[0]));
let again = false;
for (let i = 0; i < 700; i++) if (run.step(0.1, 0, 0, 'downtown') === 'offer' && run.current?.id === 'courier-strip') again = true;
check('a finished mission is not offered again', !again);
const none = new MissionRunner(MISSIONS, [], () => null);
let any = false;
for (let i = 0; i < 700; i++) if (none.step(0.1, 0, 0, 'downtown') === 'offer') any = true;
check('a place the city lacks means no offer', !any);
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
