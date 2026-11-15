import { LapCounter } from '../src/core/lapCounter.ts';
import { createKestrelBay, KESTREL_VERTICES } from '../src/world/kestrelBay.ts';
import { buildStreetPath } from '../src/world/streetPath.ts';
import { curvatureAt, halfWidthAt } from '../src/world/track.ts';
import { layoutProps } from '../src/world/propsLayout.ts';
import { createHit, locate } from '../src/world/trackQuery.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const t = createKestrelBay();
const n = t.samples.length;
check('length 1.2-1.8 km', t.length > 1200 && t.length < 1800, `${t.length.toFixed(0)} m`);
check('street width 10.5-14.5 m everywhere (widened 2026-11-15)', t.samples.every((s) => s.width >= 10.4 && s.width <= 14.6), `${Math.min(...t.samples.map((s) => s.width)).toFixed(1)}..${Math.max(...t.samples.map((s) => s.width)).toFixed(1)}`);
let maxK = 0;
for (let i = 0; i < n; i++) maxK = Math.max(maxK, Math.abs(curvatureAt(t, i)));
check('tightest corner radius 12-30 m (street corners, not a highway)', 1 / maxK >= 12 && 1 / maxK <= 30, `${(1 / maxK).toFixed(1)} m`);
check('fillets were not clamped below 12 m', buildStreetPath(KESTREL_VERTICES).minRadius >= 12, buildStreetPath(KESTREL_VERTICES).minRadius.toFixed(1));
// count real 90-degree corners: heading change over 60 m windows (corners are wider since 2026-11-15)
let corners = 0;
let cooldown = 0;
for (let i = 0; i < n; i++) {
  const a = t.samples[i].tangent;
  const b = t.samples[(i + 20) % n].tangent;
  const dh = Math.abs(Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z));
  if (cooldown > 0) cooldown--;
  else if (dh > 1.2) {
    corners++;
    cooldown = 25;
  }
}
check('at least 8 tight (about 90 degree) corners', corners >= 8, `${corners}`);
for (const z of ['street', 'alley', 'plaza', 'tunnel', 'bridge', 'dock'] as const) check(`zone ${z} present`, t.zones.includes(z), `${t.zones.filter((q) => q === z).length * t.spacing | 0} m`);
const run = (z: string): number => t.zones.filter((q) => q === z).length * t.spacing;
check('tunnel is 80+ m, bridge is 30-60 m, dock is 150+ m', run('tunnel') >= 80 && run('bridge') >= 30 && run('bridge') <= 60 && run('dock') >= 150, `${run('tunnel') | 0}/${run('bridge') | 0}/${run('dock') | 0}`);
let sep = 1e9;
for (let i = 0; i < n; i++)
  for (let j = i + 1; j < n; j++) {
    if (Math.min(j - i, n - j + i) * t.spacing < 80) continue;
    sep = Math.min(sep, Math.hypot(t.samples[i].position.x - t.samples[j].position.x, t.samples[i].position.z - t.samples[j].position.z));
  }
check('different streets stay >= 28 m apart', sep >= 28, `${sep.toFixed(0)} m`);
check('walls are 0.5-1.2 m outside the tarmac', t.samples.every((_, i) => t.wall[i] - halfWidthAt(t, i) > 0.5 && t.wall[i] - halfWidthAt(t, i) < 1.2), '');
check('start line (index 0) is on Main Street heading east', Math.abs(t.samples[0].position.x - 30) < 3 && Math.abs(t.samples[0].position.z) < 3 && t.samples[0].tangent.x > 0.99, `${t.samples[0].position.x.toFixed(1)}, ${t.samples[0].position.z.toFixed(1)}`);
let straightBehind = true;
for (let i = n - 16; i < n; i++) if (Math.abs(curvatureAt(t, i)) > 0.003) straightBehind = false;
check('grid area behind the line is straight', straightBehind, '');
check('spacing uniform', Math.abs(Math.hypot(t.samples[1].position.x - t.samples[0].position.x, t.samples[1].position.z - t.samples[0].position.z) - t.spacing) < 0.2, t.spacing.toFixed(2));

const hit = createHit();
const p = t.samples[40].position;
const tg = t.samples[40].tangent;
locate(t, p.x + tg.z * 3, p.z - tg.x * 3, 35, hit);
check('lateral + = left', hit.index === 40 && Math.abs(hit.lateral - 3) < 0.1, `idx ${hit.index} lat ${hit.lateral.toFixed(2)}`);
check('windowed == full search', locate(t, p.x, p.z, -1, createHit()).index === 40, '');

const lc = new LapCounter(t);
lc.reset(n - 5);
for (let i = 0; i < n * 3 + 20; i++) lc.update((n - 5 + i) % n);
check('3 laps counted', lc.laps === 3, `laps ${lc.laps}`);
const lc2 = new LapCounter(t);
lc2.reset(n - 5);
for (let k = 0; k < 50; k++) {
  for (let i = 0; i < 30; i++) lc2.update((n - 5 + i) % n);
  for (let i = 30; i > 0; i--) lc2.update((n - 5 + i) % n);
}
check('oscillating gives no lap', lc2.laps === 0, `laps ${lc2.laps}`);
const lc3 = new LapCounter(t);
lc3.reset(2);
lc3.update(Math.floor(n / 2));
check('shortcut jump ignored', lc3.laps === 0 && lc3.total < n / 6, `total ${lc3.total}`);

// props
const L = layoutProps(t);
check('parked cars placed', L.parked.length >= 6, `${L.parked.length}`);
check('cones, manholes, crosswalks, vents placed', L.cones.length >= 8 && L.manholes.length >= 20 && L.crosswalks.length >= 2 && L.vents.length >= 5, `${L.cones.length}/${L.manholes.length}/${L.crosswalks.length}/${L.vents.length}`);
check('start grid is clear of props', [...L.parked, ...L.cones].every((q) => q.index < n - 26 && q.index > 6), '');
let leaves = 0;
for (const q of L.parked) {
  const hw = halfWidthAt(t, q.index);
  const hl = locate(t, q.x, q.z, q.index, createHit());
  if (Math.abs(hl.lateral) > t.wall[q.index] || Math.abs(hl.lateral) < hw - 2.5) leaves++;
}
check('parked cars sit at the kerb, inside the walls', leaves === 0, `${leaves} misplaced`);
let blocked = 0;
for (let i = 0; i < n; i++) {
  const s = t.samples[i];
  let free = halfWidthAt(t, i) * 2;
  for (const o of L.obstacles.near(i)) {
    const l = (o.x - s.position.x) * s.tangent.z - (o.z - s.position.z) * s.tangent.x;
    if (Math.abs(l) < halfWidthAt(t, i)) free = Math.min(free, halfWidthAt(t, i) * 2 - (halfWidthAt(t, i) - Math.abs(l) + o.r));
  }
  if (free < 6.5) blocked++;
}
check('at least 6.5 m of road stays free past parked cars', blocked === 0, `${blocked} blocked samples`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
