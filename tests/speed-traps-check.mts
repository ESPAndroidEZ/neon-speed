/* Free Drive speed traps (core/speedTraps.ts): 12 placed deterministically on long straights, spread out, on the road;
 * a car driving through is caught once (either direction); passing beside the road or parallel to it is not. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { RoadIndex, createRoadHit } from '../src/world/roads/roadIndex.ts';
import { placeSpeedTraps, crossed } from '../src/core/speedTraps.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), traps = placeSpeedTraps(g), idx = new RoadIndex(g), hit = createRoadHit();
check('12 speed traps', traps.length === 12, String(traps.length));
check('same city, same traps', JSON.stringify(placeSpeedTraps(generateRoads(7))) === JSON.stringify(traps));
check('each on its road', traps.every((t) => { idx.nearest(t.x, t.z, hit); return hit.dist < 1; }));
let minGap = Infinity;
for (const a of traps) for (const b of traps) if (a !== b) minGap = Math.min(minGap, Math.hypot(a.x - b.x, a.z - b.z));
check('spread out (>= 600 m apart)', minGap >= 600, `${minGap.toFixed(0)} m`);
const t = traps[0];
let caught = 0;
for (let s = -40; s < 40; s += 1.5) if (crossed(t, t.x + t.tx * s, t.z + t.tz * s, t.x + t.tx * (s + 1.5), t.z + t.tz * (s + 1.5))) caught++;
check('driving through: caught exactly once', caught === 1, String(caught));
check('the other way too', crossed(t, t.x + t.tx * 5, t.z + t.tz * 5, t.x - t.tx * 5, t.z - t.tz * 5));
const off = t.half + 3; // beside the road
check('passing beside the road is not caught', !crossed(t, t.x + t.tz * off - t.tx * 5, t.z - t.tx * off - t.tz * 5, t.x + t.tz * off + t.tx * 5, t.z - t.tx * off + t.tz * 5));
check('driving across the road at the trap line is not a pass', !crossed(t, t.x + t.tz * 6, t.z - t.tx * 6, t.x - t.tz * 6, t.z + t.tx * 6));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
