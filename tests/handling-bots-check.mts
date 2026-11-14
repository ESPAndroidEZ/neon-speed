import { CARS } from '../src/data/cars.ts';
import { runLaps, WEATHERS } from './lab/laps.mts';
import { scenarios } from './lab/scenarios.mts';

/* Handling regression (session 7): a keyboard-style bot must not spin, drifts must start, hold and recover. Full lab: `npm run handling`. */
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
for (const c of CARS) {
  let spins = 0, laps = 0, stuck = 0;
  for (const track of ['kestrel', 'neon', 'cliff']) for (const weather of WEATHERS) {
    const r = runLaps({ car: c.id, track, weather, bot: 'keyboard', laps: 2 });
    spins += r.spins; laps += r.laps; stuck += r.stuck;
  }
  check(`${c.id}: keyboard driver spins less than once per 3 laps, never stuck`, spins / laps < 1 / 3 && stuck === 0 && laps === 18, `${spins} spins, ${stuck} stuck in ${laps} laps`);
  const s = scenarios(c.id);
  const awd = c.id === 'evo';
  check(`${c.id}: handbrake flick starts a drift without spinning`, s.driftStart > (awd ? 0.35 : 0.45) && s.driftStart < 1.0, `${s.driftStart.toFixed(2)} rad`);
  check(`${c.id}: releasing everything straightens the car`, s.recoverT < 2 && s.recoverMax < 0.95, `${s.recoverT.toFixed(2)} s, peak ${s.recoverMax.toFixed(2)} rad`);
  check(`${c.id}: responsive at 40-120 km/h`, Math.max(s.resp40, s.resp80, s.resp120) < 0.2, `${s.resp40.toFixed(2)} / ${s.resp80.toFixed(2)} / ${s.resp120.toFixed(2)} s`);
  check(`${c.id}: a key tap at 200 km/h is not twitchy`, s.tapShift < 2.6 && s.tapSlip < 0.08, `${s.tapShift.toFixed(2)} m, ${s.tapSlip.toFixed(2)} rad`);
  check(`${c.id}: braking with the wheel turned does not swap ends`, s.brakeSlip < 0.6, `${s.brakeSlip.toFixed(2)} rad`);
  check(`${c.id}: U-turn fits a two-lane street`, s.uTurn < 9.5 && s.reverse > 20, `${s.uTurn.toFixed(1)} m, reverse ${s.reverse.toFixed(0)} km/h`);
}
const rwd = ['350z', 'rx7', 'supra'].map((id) => scenarios(id).driftHold);
check('rear-drive cars hold a power drift', rwd.every((h) => h >= 0.65), rwd.map((h) => h.toFixed(2)).join(' '));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
