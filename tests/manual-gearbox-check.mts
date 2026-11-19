import { EV_UPSHIFT } from '../src/physics/driveEvents.ts';
import { Drivetrain } from '../src/physics/drivetrain.ts';
import { createDefaultTuning } from '../src/physics/carTuning.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const make = (manual: boolean): Drivetrain => {
  const d = new Drivetrain(createDefaultTuning());
  d.manual = manual;
  return d;
};
/** Run `sec` seconds at a speed that tracks the current gear's top (so rpm climbs), full throttle. */
const run = (d: Drivetrain, sec: number, u: number, press?: (i: number) => void): void => {
  for (let i = 0; i < sec * 60; i++) {
    press?.(i);
    d.update(D, u, 1, 0, false);
  }
};

const auto = make(false);
run(auto, 6, 45);
check('automatic still shifts up by itself', auto.gear > 1, `gear ${auto.gear}`);

const m = make(true);
run(m, 6, 45);
check('manual never shifts up by itself', m.gear === 1, `gear ${m.gear}`);

// one shift per press: holding the button for a second shifts once
const h = make(true);
run(h, 1, 20, () => { h.shiftUp = true; });
check('holding the shift button shifts once', h.gear === 2, `gear ${h.gear}`);
h.shiftUp = false;
run(h, 0.5, 20);
h.shiftUp = true;
run(h, 0.5, 20);
check('a second press shifts again', h.gear === 3, `gear ${h.gear}`);
h.shiftUp = false;
run(h, 0.5, 20);
h.shiftDown = true;
run(h, 0.5, 20);
check('down shifts down one gear', h.gear === 2, `gear ${h.gear}`);
h.shiftDown = false;
for (let k = 0; k < 12; k++) {
  h.shiftUp = true;
  run(h, 0.3, 30);
  h.shiftUp = false;
  run(h, 0.3, 30);
}
check('never above the top gear', h.gear === 6, `gear ${h.gear}`);
for (let k = 0; k < 12; k++) {
  h.shiftDown = true;
  run(h, 0.3, 30);
  h.shiftDown = false;
  run(h, 0.3, 30);
}
check('never below first (reverse is only by braking)', h.gear === 1, `gear ${h.gear}`);

// coming to a stop in a high gear drops to first
const s = make(true);
s.gear = 5;
run(s, 0.1, 0.5);
check('a stop in a high gear drops to first (no stall)', s.gear === 1, `gear ${s.gear}`);

// shift events still fire (sounds / turbo cues depend on them)
const e = make(true);
let ups = 0;
e.shiftUp = true;
run(e, 0.1, 20);
e.events.drain((type) => { if (type === EV_UPSHIFT) ups++; });
check('a manual shift pushes the upshift event', ups === 1, `${ups} upshift events`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
