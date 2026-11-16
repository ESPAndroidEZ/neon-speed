// @ts-nocheck
import { LaunchRev } from '../src/audio/launchRev.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const IDLE = 900, RED = 7000, DT = 1 / 60;

let r = new LaunchRev();
for (let i = 0; i < 120; i++) r.hold(DT, 1, IDLE, RED);
const held = r.rpm;
check('gas flat on the line revs the engine well above idle', held > 3500 && held < RED * 0.7, `${held.toFixed(0)} rpm`);
check('hold stays below the limiter all the time', (() => { const q = new LaunchRev(); let mx = 0; for (let i = 0; i < 400; i++) { q.hold(DT, 1, IDLE, RED); mx = Math.max(mx, q.rpm); } return mx < RED * 0.7; })(), '');
check('reports full load while the gas is down', r.load === 1, `${r.load}`);

r = new LaunchRev();
for (let i = 0; i < 60; i++) r.hold(DT, 0, IDLE, RED);
check('no gas stays at idle', Math.abs(r.rpm - IDLE) < 1, `${r.rpm.toFixed(0)} rpm`);

r = new LaunchRev();
for (let i = 0; i < 60; i++) r.hold(DT, 1, IDLE, RED);
const peak = r.rpm;
for (let i = 0; i < 30; i++) r.hold(DT, 0, IDLE, RED);
check('lifting the gas drops the rev again', r.rpm < peak * 0.7 && r.rpm >= IDLE, `${peak.toFixed(0)} -> ${r.rpm.toFixed(0)}`);

r = new LaunchRev();
for (let i = 0; i < 90; i++) r.hold(DT, 1, IDLE, RED);
const first = r.release(DT, 1200);
check('at GO the sound does not snap to the real rpm', first > 3000, `${first.toFixed(0)} rpm on the first frame`);
let out = first;
for (let i = 0; i < 90; i++) out = r.release(DT, 3000);
check('it settles on the real rpm within a second and a half', Math.abs(out - 3000) < 30, `${out.toFixed(0)} rpm`);
check('real rpm above the held rev passes straight through', new LaunchRev().release(DT, 5200) === 5200, '');
check('output is always finite', (() => { const q = new LaunchRev(); for (let i = 0; i < 1000; i++) q.hold(0.5, 2, IDLE, RED); return Number.isFinite(q.rpm) && q.rpm < RED; })(), '');

console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
