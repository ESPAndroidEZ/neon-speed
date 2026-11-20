/* Neon Harbor pedestrians (physics/roamPeds.ts): they walk the sidewalks (never the tarmac), keep a walking pace, are
 * never closer than 2.2 m to a car (they step back, or leave), follow the player around the city and stay cheap. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { RoadIndex } from '../src/world/roads/roadIndex.ts';
import { RoamPeds } from '../src/physics/roamPeds.ts';
import { RoamTraffic } from '../src/physics/roamTraffic.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), idx = new RoadIndex(g), D = 1 / 60;
const peds = new RoamPeds(g, 30, 4), tr = new RoamTraffic(g, 40, 6);
const old = g.nodes.filter((n) => n.district === 'oldtown'), ox = old.reduce((a, n) => a + n.x, 0) / old.length, oz = old.reduce((a, n) => a + n.z, 0) / old.length;
peds.scatter(ox, oz); tr.scatter(ox, oz);
const cars = new Float32Array(82);
let onRoad = 0, samples = 0, tooClose = 0, moved = 0, nan = 0;
const t0 = performance.now();
for (let k = 0; k < 60 * 120; k++) {
  tr.step(D, ox, oz, 1);
  cars[0] = ox; cars[1] = oz;
  for (let i = 0; i < 40; i++) { cars[2 + i * 2] = tr.x[i]; cars[3 + i * 2] = tr.z[i]; }
  const px = Float32Array.from(peds.x), pz = Float32Array.from(peds.z);
  peds.step(D, ox, oz, cars, 41);
  for (let i = 0; i < peds.count; i++) {
    if (!Number.isFinite(peds.x[i])) nan++;
    const step = Math.hypot(peds.x[i] - px[i], peds.z[i] - pz[i]);
    if (step < 0.2) moved += step; // ignore respawns
    for (let c = 0; c < 41; c++) if (Math.hypot(cars[c * 2] - peds.x[i], cars[c * 2 + 1] - peds.z[i]) < 2.2) tooClose++;
    if (k % 60 === 0) { samples++; if (idx.surfaceAt(peds.x[i], peds.z[i]) === 'asphalt' || idx.surfaceAt(peds.x[i], peds.z[i]) === 'wet') onRoad++; }
  }
}
const us = ((performance.now() - t0) / (60 * 120)) * 1000;
check('no NaN', nan === 0);
check('people walk the sidewalks, not the tarmac (<= 5 % of samples)', onRoad <= samples * 0.05, `${onRoad} of ${samples} on tarmac`);
const pace = moved / (120 * peds.count);
check('walking pace (0.8 - 1.5 m/s average)', pace > 0.8 && pace < 1.5, `${pace.toFixed(2)} m/s`);
check('never within 2.2 m of a car after a step', tooClose === 0, String(tooClose));
check('cheap with traffic (< 0.3 ms per step for both)', us < 300, `${us.toFixed(0)} us`);
for (let k = 0; k < 60 * 2; k++) peds.step(D, ox + 1200, oz, cars, 0);
let far = 0;
for (let i = 0; i < peds.count; i++) if (Math.hypot(peds.x[i] - ox - 1200, peds.z[i] - oz) > 300) far++;
check('people follow the player across the city', far === 0, `${far} left behind`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
