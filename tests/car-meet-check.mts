/* Free Drive car meet (core/carMeet.ts): in the harbour, away from the drift zones, 8 parking slots inside the circle
 * facing its centre; the greeting comes once per visit after standing still for 2 s. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { districtAt } from '../src/data/world/districtMap.ts';
import { placeDriftZones } from '../src/core/driftZones.ts';
import { MeetWatch, placeCarMeet } from '../src/core/carMeet.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), zones = placeDriftZones(g), m = placeCarMeet(g, zones);
check('a car meet exists in the harbour', !!m && districtAt(m.x, m.z) === 'harbour');
if (m) {
  check('at least 200 m from every drift zone', zones.every((z) => Math.hypot(z.x - m.x, z.z - m.z) >= 200));
  check('8 slots inside the circle, noses to the centre', m.slots.length === 8 && m.slots.every((s) => Math.hypot(s.x - m.x, s.z - m.z) < m.r && Math.cos(s.h - Math.atan2(m.x - s.x, m.z - s.z)) > 0.99));
  let gap = Infinity;
  for (const a of m.slots) for (const b of m.slots) if (a !== b) gap = Math.min(gap, Math.hypot(a.x - b.x, a.z - b.z));
  check('parked cars do not overlap (>= 2.5 m apart)', gap >= 2.5, `${gap.toFixed(1)} m`);
  const w = new MeetWatch(m), D = 1 / 60;
  let says = 0;
  for (let k = 0; k < 60; k++) if (w.update(m.x, m.z, 5, D)) says++; // rolling through
  check('rolling through: no greeting', says === 0);
  for (let k = 0; k < 60 * 5; k++) if (w.update(m.x, m.z, 0.2, D)) says++;
  check('standing still 2 s: greeted once', says === 1, String(says));
  w.update(m.x + 100, m.z, 0, D);
  for (let k = 0; k < 60 * 3; k++) if (w.update(m.x, m.z, 0, D)) says++;
  check('leave and come back: greeted again', says === 2, String(says));
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
