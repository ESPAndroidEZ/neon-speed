import { LapCounter } from '../src/core/lapCounter.ts';
import { createHarborLoop } from '../src/world/harborLoop.ts';
import { curvatureAt } from '../src/world/track.ts';
import { createHit, locate } from '../src/world/trackQuery.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const t = createHarborLoop();
const n = t.samples.length;
check('length 1.2-1.7 km', t.length > 1200 && t.length < 1700, `${t.length.toFixed(0)} m`);
let maxK = 0;
for (let i = 0; i < n; i++) maxK = Math.max(maxK, Math.abs(curvatureAt(t, i)));
check('tightest corner radius >= 15 m', 1 / maxK >= 15, `${(1 / maxK).toFixed(1)} m`);
let sep = 1e9;
for (let i = 0; i < n; i++)
  for (let j = i + 1; j < n; j++) {
    if (Math.min(j - i, n - j + i) * t.spacing < 80) continue;
    sep = Math.min(sep, Math.hypot(t.samples[i].position.x - t.samples[j].position.x, t.samples[i].position.z - t.samples[j].position.z));
  }
check('no self-overlap (>= 40 m apart)', sep >= 40, `${sep.toFixed(0)} m`);
check('spacing uniform', Math.abs(Math.hypot(t.samples[1].position.x - t.samples[0].position.x, t.samples[1].position.z - t.samples[0].position.z) - t.spacing) < 0.2, t.spacing.toFixed(2));

const hit = createHit();
const p = t.samples[40].position;
const tg = t.samples[40].tangent;
locate(t, p.x + tg.z * 3, p.z - tg.x * 3, 35, hit); // 3 m to the left
check('lateral + = left', hit.index === 40 && Math.abs(hit.lateral - 3) < 0.1, `idx ${hit.index} lat ${hit.lateral.toFixed(2)}`);
check('windowed == full search', locate(t, p.x, p.z, -1, createHit()).index === 40, '');

// drive the centre line: 3 laps
const lc = new LapCounter(t);
lc.reset(n - 5);
for (let i = 0; i < n * 3 + 20; i++) lc.update((n - 5 + i) % n);
check('3 laps counted', lc.laps === 3, `laps ${lc.laps}`);
// reversing and oscillating does not farm laps
const lc2 = new LapCounter(t);
lc2.reset(n - 5);
for (let k = 0; k < 50; k++) {
  for (let i = 0; i < 30; i++) lc2.update((n - 5 + i) % n);
  for (let i = 30; i > 0; i--) lc2.update((n - 5 + i) % n);
}
check('oscillating gives no lap', lc2.laps === 0, `laps ${lc2.laps}`);
// shortcut jump ignored
const lc3 = new LapCounter(t);
lc3.reset(2);
lc3.update(Math.floor(n / 2));
check('shortcut jump ignored', lc3.laps === 0 && lc3.total < n / 6, `total ${lc3.total}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
