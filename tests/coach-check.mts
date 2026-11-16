import { COACH_EXPIRE, COACH_MAX_RACES, coachUpdate, newCoachMemory, newCoachRun } from '../src/game/coachLogic';
import { createNeutralInput } from '../src/types/game';

let fails = 0;
const ok = (c: boolean, m: string): void => {
  if (!c) { fails++; console.error('FAIL', m); }
};
const inp = createNeutralInput();
const reset = (): void => { inp.throttle = 0; inp.brake = 0; inp.nitro = false; inp.handbrake = false; };

// idle driver: gas hint appears after 1.5 s, expires after COACH_EXPIRE, never before
{
  const m = newCoachMemory(), r = newCoachRun();
  reset();
  ok(coachUpdate(m, r, inp, 0.5, 0, 1, 0.016) === -1, 'nothing before 1.5 s');
  ok(coachUpdate(m, r, inp, 2, 0, 1, 0.016) === 0, 'gas hint at 2 s');
  ok(m.shown[0] === 1, 'counted once');
  for (let t = 2; t < 2 + COACH_EXPIRE + 0.5; t += 0.1) coachUpdate(m, r, inp, t, 0, 1, 0.1);
  ok(coachUpdate(m, r, inp, 10.5, 0, 1, 0.1) !== 0, 'gas hint expired');
  ok(m.shown[0] === 1, 'still counted once');
}
// using the control retires its hint for good
{
  const m = newCoachMemory(), r = newCoachRun();
  reset();
  inp.throttle = 1;
  ok(coachUpdate(m, r, inp, 2, 30, 1, 0.016) === -1, 'throttle used, no gas hint');
  ok(m.used[0] && m.dirty, 'gas marked used and dirty');
  inp.throttle = 0;
  ok(coachUpdate(m, r, inp, 10, 130, 1, 0.016) === 1, 'brake hint at speed after 9 s');
  inp.brake = 1;
  ok(coachUpdate(m, r, inp, 11, 120, 1, 0.016) !== 1, 'brake hint gone once braking');
  ok(m.used[1], 'brake used');
  reset();
  ok(coachUpdate(m, r, inp, 12, 120, 0.6, 0.016) === 2, 'nitro hint with a tank');
  inp.nitro = true;
  coachUpdate(m, r, inp, 13, 120, 0.6, 0.016);
  ok(m.used[2], 'nitro used');
  reset();
  ok(coachUpdate(m, r, inp, 17, 120, 0.6, 0.016) === 3, 'handbrake hint late');
  inp.handbrake = true;
  ok(coachUpdate(m, r, inp, 18, 120, 0.6, 0.016) === -1, 'all done, nothing left');
}
// nitro hint never shows with an empty tank; brake hint needs speed
{
  const m = newCoachMemory(), r = newCoachRun();
  reset();
  m.used[0] = true;
  ok(coachUpdate(m, r, inp, 6, 50, 0, 0.016) === -1, 'no nitro hint on empty tank');
  ok(coachUpdate(m, r, inp, 10, 60, 0, 0.016) === -1, 'no brake hint when slow');
}
// at most COACH_MAX_RACES races per hint
{
  const m = newCoachMemory();
  reset();
  for (let race = 0; race < COACH_MAX_RACES + 2; race++) {
    const r = newCoachRun();
    coachUpdate(m, r, inp, 0, 0, 1, 0.016);
    const s = coachUpdate(m, r, inp, 2, 0, 1, 0.016);
    ok((s === 0) === (race < COACH_MAX_RACES), `race ${race} gas hint ${s}`);
  }
  // a new race (raceTime restarts) clears the per-race skip flags
  const r = newCoachRun();
  r.skipped[1] = true;
  coachUpdate(m, r, inp, 0, 0, 1, 0.016);
  ok(!r.skipped[1], 'new race resets skipped');
}
if (fails) process.exit(1);
console.log('coach-check ok');
