import { BUST_R, BUST_SPEED, BUST_TIME, copsFor, ESCAPE_R, ESCAPE_TIME, escapeCash, escapeRep, fineFor, Heat, MAX_HEAT } from '../src/core/police.ts';
import { COPS, RoamPolice } from '../src/physics/roamPolice.ts';
import { generateRoads } from '../src/world/roads/generate.ts';
import { createRoadHit, RoadIndex } from '../src/world/roads/roadIndex.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };

// the rules
const h = new Heat();
check('quiet at the start and nothing happens', h.level === 0 && h.step(1, 0, 5) === 'none');
check('stars go up to three and the cop count follows', h.raise() && h.level === 1 && h.raise() && h.raise() && !h.raise() && h.level === MAX_HEAT && copsFor(h.level) === 3 && copsFor(0) === 0 && copsFor(9) === 3);
h.reset();
h.raise();
let ev = 'none';
for (let t = 0; t < BUST_TIME - 0.2; t += 0.1) ev = h.step(0.1, 5, BUST_R - 1);
check('a close cop and a slow car fill the meter, not yet busted', ev === 'none' && h.bust > 0.9 && h.level === 1, h.bust.toFixed(2));
ev = h.step(0.5, 5, BUST_R - 1);
check('then BUSTED, and the heat is gone', ev === 'busted' && h.level === 0 && h.bust === 0);
h.raise();
for (let t = 0; t < 3; t += 0.1) h.step(0.1, 5, BUST_R - 1);
const before = h.bust;
for (let t = 0; t < 2; t += 0.1) h.step(0.1, BUST_SPEED + 10, BUST_R - 1);
check('a cop close to a fast car does not arrest and the meter drains', h.bust < before && h.level === 1);
ev = 'none';
for (let t = 0; t < ESCAPE_TIME - 0.3; t += 0.1) ev = h.step(0.1, 40, ESCAPE_R + 20);
check('clear of every cop for a while is an ESCAPE, but not before', ev === 'none');
for (let t = 0; t < 1; t += 0.1) { const e = h.step(0.1, 40, ESCAPE_R + 20); if (e !== 'none') ev = e; }
check('escaped', ev === 'escaped' && h.level === 0);
h.raise(); h.step(0.1, 40, ESCAPE_R + 20); h.step(0.1, 40, 50); // a cop catches up: the calm timer starts again
check('a cop that comes back restarts the escape timer', (() => { let e = 'none'; for (let t = 0; t < ESCAPE_TIME - 1; t += 0.1) e = h.step(0.1, 40, ESCAPE_R + 20); return e === 'none'; })());
check('fines are 6 % between 250 and 3000, prizes grow with the heat', fineFor(1000) === 250 && fineFor(20000) === 1200 && fineFor(1e6) === 3000 && escapeCash(3) > escapeCash(1) && escapeRep(3) > escapeRep(1));

// the cars on the real city
const g = generateRoads(7);
const roads = new RoadIndex(g);
const hit = createRoadHit();
const node = g.nodes.find((n) => n.district === 'downtown' && n.edges.length >= 3)!;
const px = node.x, pz = node.z;
const cops = new RoamPolice(g, roads);
check('no cops out at first, boxes parked far away', cops.count === 0 && cops.nearest(px, pz) === Infinity && cops.boxes[0] > 1e5);
cops.send(3, px, pz);
let d0 = 1e9;
for (let i = 0; i < COPS; i++) d0 = Math.min(d0, Math.hypot(cops.x[i] - px, cops.z[i] - pz));
check('three cops appear 80 to 420 m away, out of sight', cops.count === 3 && d0 > 80 && cops.nearest(px, pz) < 450, `${cops.nearest(px, pz).toFixed(0)} m`);
let ok = true, maxV = 0, offRoad = 0;
let nearAt = -1;
for (let k = 0; k < 60 * 80; k++) {
  cops.step(1 / 60, px, pz, 0);
  for (let i = 0; i < COPS; i++) {
    if (!Number.isFinite(cops.x[i]) || !Number.isFinite(cops.z[i]) || !Number.isFinite(cops.h[i])) ok = false;
    maxV = Math.max(maxV, cops.speed[i]);
  }
  if (k % 60 === 0) for (let i = 0; i < COPS; i++) { roads.nearestAny(cops.x[i], cops.z[i], hit); offRoad = Math.max(offRoad, hit.dist); }
  if (nearAt < 0 && cops.nearest(px, pz) < 12) nearAt = k / 60;
}
check('every position stays finite, speeds stay under the top speed', ok && maxV <= 58.5, `${maxV.toFixed(1)} m/s`);
check('the cops stay on the streets (never more than 8 m from a centre line)', offRoad < 8, `${offRoad.toFixed(1)} m`);
check('a cop reaches a parked car within 80 s and holds a few metres short', nearAt >= 0 && cops.nearest(px, pz) > 2, `${nearAt.toFixed(0)} s, now ${cops.nearest(px, pz).toFixed(1)} m`);
cops.bump(0);
check('hitting a cop stops it a moment', cops.speed[0] === 0);
cops.stop();
check('stop sends them all home', cops.count === 0 && cops.boxes.every((v) => v > 1e5) && cops.nearest(px, pz) === Infinity);
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
