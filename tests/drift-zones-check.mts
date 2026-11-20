/* Free Drive drift zones (core/driftZones.ts): six zones in the industrial and harbour districts, spread out, on roads;
 * a run scores only the points earned inside the zone, ends on leaving, and a teleport cancels it. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { districtAt } from '../src/data/world/districtMap.ts';
import { DriftRun, placeDriftZones } from '../src/core/driftZones.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), zones = placeDriftZones(g);
check('six drift zones', zones.length === 6, String(zones.length));
check('all in the industrial or harbour district', zones.every((z) => ['industrial', 'harbour'].includes(districtAt(z.x, z.z))));
let gap = Infinity;
for (const a of zones) for (const b of zones) if (a !== b) gap = Math.min(gap, Math.hypot(a.x - b.x, a.z - b.z));
check('at least 500 m apart', gap >= 500, `${gap.toFixed(0)} m`);
check('same city, same zones', JSON.stringify(placeDriftZones(generateRoads(7))) === JSON.stringify(zones));
const z = zones[0], run = new DriftRun(zones);
let pts = 5000; // points earned before the zone do not count
check('outside: nothing', run.update(z.x + 200, z.z, pts) === 0 && run.zone === -1);
check('entering starts a run', run.update(z.x + 40, z.z, pts) === 1 && run.zone === 0);
pts += 2600;
run.update(z.x + 10, z.z, pts);
check('score = points earned inside', run.score === 2600, String(run.score));
check('the 5 m grace at the edge keeps the run', run.update(z.x + 53, z.z, pts) === 0 && run.zone === 0);
check('leaving ends it with the score', run.update(z.x + 60, z.z, pts + 100) === 2 && run.score === 2700 && run.zone === -1, String(run.score));
run.update(z.x, z.z, pts);
run.cancel();
check('a teleport cancels the run', run.zone === -1 && run.score === 0);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
