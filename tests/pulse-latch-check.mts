// Phone handbrake / nitro tap latch: a 30 ms tap (shorter than a physics step, and between two steps) gives a full
// pulse; holding extends it; works with a steady 60 Hz display and with a jittery variable frame rate.
import { PulseLatch } from '../src/input/pulseLatch.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};
const STEP = 1 / 60;

/** Simulate wall time with display frames of the given lengths; the engine runs fixed steps from an accumulator.
 *  Pointer events fire at absolute times. Returns seconds of simulation the latch was on. */
function run(frames: () => number, events: { t: number; down: boolean }[], total = 2): number {
  const l = new PulseLatch(0.6);
  let t = 0, acc = 0, onTime = 0, ev = 0;
  while (t < total) {
    const dt = frames();
    // events that happen during this display frame (before its fixed steps run)
    while (ev < events.length && events[ev].t <= t + dt) {
      if (events[ev].down) l.press();
      else l.release();
      ev++;
    }
    t += dt;
    acc += dt;
    while (acc >= STEP) {
      if (l.step(STEP)) onTime += STEP;
      acc -= STEP;
    }
  }
  return onTime;
}
const tap = [{ t: 0.5004, down: true }, { t: 0.5304, down: false }]; // 30 ms
let seed = 7;
const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const fixed60 = run(() => 1 / 60, tap);
check('60 Hz: 30 ms tap gives the full pulse', Math.abs(fixed60 - 0.6) <= STEP * 2, `${fixed60.toFixed(3)} s`);
const vrr = run(() => 0.006 + rnd() * 0.045, tap); // 22..166 fps, jittery
check('variable frame rate: 30 ms tap gives the full pulse', Math.abs(vrr - 0.6) <= STEP * 2, `${vrr.toFixed(3)} s`);
const slow = run(() => 0.05, tap); // 20 fps: the whole tap falls inside one display frame
check('20 fps: tap inside one frame is not lost', Math.abs(slow - 0.6) <= STEP * 2, `${slow.toFixed(3)} s`);
const hold = run(() => 1 / 60, [{ t: 0.2, down: true }, { t: 1.2, down: false }]);
check('hold 1 s: on for the whole hold', Math.abs(hold - 1.0) <= STEP * 3, `${hold.toFixed(3)} s`);
const none = run(() => 1 / 60, []);
check('no input: never on', none === 0);
const l = new PulseLatch(0.6);
l.press();
l.release();
l.reset();
check('reset drops a pending tap', !l.step(STEP));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
