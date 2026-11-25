/* A traffic car the player hits is shoved along the impact, spins, rests, then eases back to its lane (no snap). */
import { generateRoads } from '../src/world/roads/generate.ts';
import { RoamTraffic } from '../src/physics/roamTraffic.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), D = 1 / 60;
const tr = new RoamTraffic(g, 40, 5);
tr.scatter(0, 0);
for (let k = 0; k < 120; k++) tr.step(D, 0, 0, 1);
const i = 3, x0 = tr.x[i], z0 = tr.z[i], h0 = tr.h[i];
tr.bump(i, 12, 0, 1);
let maxMove = 0, maxTurn = 0, jump = 0, px = x0, pz = z0;
for (let k = 0; k < 60 * 3.1; k++) {
  tr.step(D, 0, 0, 1);
  maxMove = Math.max(maxMove, Math.hypot(tr.x[i] - x0, tr.z[i] - z0));
  maxTurn = Math.max(maxTurn, Math.abs(tr.h[i] - h0));
  jump = Math.max(jump, Math.hypot(tr.x[i] - px, tr.z[i] - pz) - tr.agents[i].speed * D); // beyond its own rolling (a car shoved from behind rolls on)
  px = tr.x[i]; pz = tr.z[i];
}
check('the hit car is shoved at least 1.5 m', maxMove > 1.5, maxMove.toFixed(2));
check('the hit car spins at least 0.3 rad', maxTurn > 0.3, maxTurn.toFixed(2));
check('no snap: no step moves it more than 0.3 m', jump < 0.3, jump.toFixed(3));
for (let k = 0; k < 60 * 3; k++) tr.step(D, 0, 0, 1);
check('the offsets are gone after the stall (back on its lane)', !tr.knock.active(i));
let nan = 0;
for (let j = 0; j < 40; j++) if (!Number.isFinite(tr.x[j] + tr.z[j] + tr.h[j])) nan++;
check('no NaN poses', nan === 0);
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
