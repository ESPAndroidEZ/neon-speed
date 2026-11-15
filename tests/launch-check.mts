// Launch timing at the countdown: a perfect launch is clearly faster off the line, an over-revved one slower.
import { RaceManager } from '../src/core/raceManager.ts';
import { createDefaultTuning } from '../src/physics/carTuning.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';
import { createNeutralInput } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const D = 1 / 60;
const track = createKestrelBay();

/** Press the throttle `pressAt` seconds before GO (-1 = only at GO), return the result and speed 1.5 s after GO. */
function start(pressAt: number): { result: string; speed: number } {
  const rm = new RaceManager(track, 3);
  const p = rm.addRacer('me', 'You', createDefaultTuning(), null, true);
  rm.start();
  const inp = createNeutralInput();
  let t = -3;
  while (rm.phase !== 'RACING') { inp.throttle = pressAt >= 0 && t >= -pressAt ? 1 : 0; rm.step(D, inp, 'CLEAR'); t += D; }
  const result = rm.launch.result;
  inp.throttle = 1;
  for (let i = 0; i < 90; i++) rm.step(D, inp, 'CLEAR');
  return { result, speed: p.car.state.speed };
}
const perfect = start(0.3), good = start(0.9), early = start(2.5), none = start(-1);
check('press 0.3 s before GO = PERFECT', perfect.result === 'PERFECT', perfect.result);
check('press 0.9 s before GO = GOOD', good.result === 'GOOD', good.result);
check('held from 3 = EARLY (over-revved)', early.result === 'EARLY', early.result);
check('no press = NONE', none.result === 'NONE', none.result);
check('perfect > good > none > early off the line', perfect.speed > good.speed && good.speed > none.speed && none.speed > early.speed,
  `${perfect.speed.toFixed(1)} / ${good.speed.toFixed(1)} / ${none.speed.toFixed(1)} / ${early.speed.toFixed(1)} m/s after 1.5 s`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
