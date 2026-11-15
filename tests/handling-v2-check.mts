import { execFileSync } from 'node:child_process';
import { REAL } from '../src/data/carReal.ts';
import { CARS } from '../src/data/cars.ts';
import { DRIVING, HANDLING } from '../src/physics/assists.ts';
import { measureCar } from '../src/physics/carStats.ts';
import { runLaps, WEATHERS } from './lab/laps.mts';
import { accelTo, brake100, exitGain, IDS, skidpad, slalom, understeer } from './lab/v2.mts';

/* Handling v2 validation: every target of docs/handling-plan.md section 5, on the v2 model with the default stability (LIGHT). */
HANDLING.model = 'v2';
DRIVING.stability = 'LIGHT';
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const fmt = (o: Record<string, number>, d = 2): string => IDS.map((id) => `${id} ${o[id].toFixed(d)}`).join(', ');
const map = (f: (id: string) => number): Record<string, number> => Object.fromEntries(IDS.map((id) => [id, f(id)]));
/** Groups in descending order: each group's worst beats the next group's best; `near` = max spread inside a group. */
const ordered = (v: Record<string, number>, groups: string[][], near = Infinity, eq = false): boolean =>
  groups.every((g, i) => Math.max(...g.map((id) => v[id])) - Math.min(...g.map((id) => v[id])) <= near &&
    (i === 0 || (eq && i === 1 ? Math.min(...groups[0].map((id) => v[id])) >= Math.max(...g.map((id) => v[id])) : Math.min(...groups[i - 1].map((id) => v[id])) > Math.max(...g.map((id) => v[id])))));
const layout = (id: string): string => CARS.find((c) => c.id === id)!.tuning.v2!.spec.drive;
const of = (l: string): string[] => IDS.filter((id) => layout(id) === l);

// 1. skidpad
const sk = map((id) => skidpad(id));
check('skidpad R 40 m dry: 0.85-1.05 g for every car', IDS.every((id) => sk[id] >= 0.85 && sk[id] <= 1.05), fmt(sk, 3));
check('skidpad order Evo >= M3 ~ RX-7 > Supra ~ 350Z > Civic ~ Golf > E61 (~ = within 0.03 g)', ordered(sk, [['evo'], ['m3', 'rx7'], ['supra', '350z'], ['civic', 'golf'], ['e61']], 0.03, true), '');
// 2-3. acceleration
const acc = map((id) => measureCar(CARS.find((c) => c.id === id)!.tuning).accel);
const top = map((id) => measureCar(CARS.find((c) => c.id === id)!.tuning).topKph);
check('0-100 km/h within 10 % of the real car (data/carReal)', IDS.every((id) => Math.abs(acc[id] - REAL[id].zeroTo100) <= REAL[id].zeroTo100 * 0.1), fmt(acc));
check('top speed within 15 % of the real car', IDS.every((id) => Math.abs(top[id] - REAL[id].top) <= REAL[id].top * 0.15), fmt(top, 0));
const t200 = map((id) => accelTo(id, 200));
const pw = (id: string): number => REAL[id].ps / REAL[id].kg;
const by200 = [...IDS].sort((a, b) => t200[a] - t200[b]);
// 0-200 is drag-bound near the top speed, so the power/weight order is checked among cars whose real top speed is >= 240 km/h
const fast = IDS.filter((id) => REAL[id].top >= 240);
const mono = fast.every((a) => fast.every((b) => !(pw(a) > pw(b) * 1.1) || t200[a] < t200[b]));
check('0-200: Supra and M3 among the 3 fastest, E61 and Golf among the 3 slowest, monotonic with power/weight (>10 % apart, top >= 240)',
  by200.slice(0, 3).includes('supra') && by200.slice(0, 3).includes('m3') && by200.slice(-3).includes('e61') && by200.slice(-3).includes('golf') && mono, fmt(t200, 1));
// 4. braking
const bd = map((id) => brake100(id, 'CLEAR'));
const br = map((id) => brake100(id, 'RAIN') / bd[id]);
const bs = map((id) => brake100(id, 'SNOW') / bd[id]);
check('100-0 km/h dry 34-42 m', IDS.every((id) => bd[id] >= 34 && bd[id] <= 42), fmt(bd, 1));
check('braking rain 1.3-1.5x dry, snow 2.0-2.6x', IDS.every((id) => br[id] >= 1.3 && br[id] <= 1.5 && bs[id] >= 2 && bs[id] <= 2.6), `rain ${fmt(br)}; snow ${fmt(bs)}`);
// 5. slalom
const sl = map((id) => slalom(id));
check('slalom entry speed: Evo, RX-7, M3 > Civic > 350Z, Supra > Golf > E61', ordered(sl, [['evo', 'rx7', 'm3'], ['civic'], ['350z', 'supra'], ['golf'], ['e61']]), fmt(sl, 1));
// 6. understeer gradient (deg/g)
const us = Object.fromEntries(IDS.map((id) => [id, understeer(id)]));
const ku = map((id) => us[id].cruise), kp = map((id) => us[id].power);
const fwdMin = Math.min(...of('FWD').map((id) => ku[id]));
check('understeer gradient at 60 km/h: FWD > 0', of('FWD').every((id) => ku[id] > 0), fmt(ku));
check('RWD lower than FWD, and < 0 on power', of('RWD').every((id) => ku[id] < fwdMin && kp[id] < 0), `power ${fmt(kp)}`);
check('AWD near 0 (|K| < 0.5 deg/g, below FWD)', of('AWD').every((id) => Math.abs(ku[id]) < 0.5 && ku[id] < fwdMin), '');
// 7. weather grip
const skR = map((id) => skidpad(id, 'RAIN') / sk[id]), skS = map((id) => skidpad(id, 'SNOW') / sk[id]);
check('steady lateral g rain/dry and snow/dry follow the weather mu (0.72 / 0.45, within 0.04) for every car', IDS.every((id) => Math.abs(skR[id] - 0.72) < 0.04 && Math.abs(skS[id] - 0.45) < 0.04), `rain ${fmt(skR)}; snow ${fmt(skS)}`);
const ex = Object.fromEntries(IDS.map((id) => [id, [exitGain(id, 'CLEAR').gain, exitGain(id, 'RAIN').gain, exitGain(id, 'SNOW').gain]]));
const exR = map((id) => ex[id][1] / ex[id][0]), exS = map((id) => ex[id][2] / ex[id][0]);
const mean = (ids: string[], o: Record<string, number>): number => ids.reduce((a, id) => a + o[id], 0) / ids.length;
const awdBest = (o: Record<string, number>): boolean => of('AWD').every((a) => IDS.every((id) => id === a || o[a] > o[id]));
check('throttle-exit grip ratio wet/dry: AWD best, FWD > RWD (rain and snow)', awdBest(exR) && awdBest(exS) && mean(of('FWD'), exR) > mean(of('RWD'), exR) && mean(of('FWD'), exS) > mean(of('RWD'), exS), `rain ${fmt(exR)}; snow ${fmt(exS)}`);
// 8. stability: keyboard bot, every car, the three maps of tests/handling-bots-check
for (const c of CARS) {
  let spins = 0, laps = 0, stuck = 0;
  for (const track of ['kestrel', 'neon', 'cliff']) for (const weather of WEATHERS) {
    const r = runLaps({ car: c.id, track, weather, bot: 'keyboard', laps: 2 });
    spins += r.spins; laps += r.laps; stuck += r.stuck;
  }
  DRIVING.stability = 'LIGHT';
  check(`${c.id}: keyboard bot spins less than once per 3 laps, never stuck`, spins / laps < 1 / 3 && stuck === 0 && laps >= 16, `${spins} spins, ${stuck} stuck in ${laps} laps`);
}
// 9. determinism: the save round-trip suite on the v2 model
let rt = 'ok';
try { execFileSync('npx', ['tsx', 'tests/save-roundtrip.mts'], { env: { ...process.env, HANDLING: 'v2' }, stdio: 'pipe' }); } catch (e) { rt = String((e as { stdout?: Buffer }).stdout ?? e).split('\n').filter((l) => l.startsWith('FAIL')).join('; '); }
check('snapshot/restore mid-race runs identically on v2 (tests/save-roundtrip with HANDLING=v2)', rt === 'ok', rt);
HANDLING.model = 'legacy';
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
