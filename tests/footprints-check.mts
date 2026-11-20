/* Neon Harbor buildings (world/open/footprints.ts): deterministic, fast, every land district built up, nothing on a
 * road, sidewalk or the water, no two buildings overlap, fronts face the street, heights follow the district grammar. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { RoadIndex, createRoadHit } from '../src/world/roads/roadIndex.ts';
import { GRAMMAR, isWater } from '../src/world/roads/grammar.ts';
import { generateFootprints, cornerOf, overlaps } from '../src/world/open/footprints.ts';
import { DISTRICTS } from '../src/types/world.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7);
const t0 = performance.now();
const fs = generateFootprints(g);
const ms = performance.now() - t0;
check('generates in under 1.5 s', ms < 1500, `${ms.toFixed(0)} ms, ${fs.length} buildings`);
const again = generateFootprints(generateRoads(7));
check('same seed, same buildings', again.length === fs.length && again.every((f, i) => f.x === fs[i].x && f.height === fs[i].height));
const per = Object.fromEntries(DISTRICTS.map((d) => [d, fs.filter((f) => f.district === d).length]));
check('every land district has buildings, the bay none', DISTRICTS.every((d) => (d === 'bay' ? per[d] === 0 : per[d] > 20)), JSON.stringify(per));
const idx = new RoadIndex(g);
let onRoad = 0, wet = 0;
const c = { x: 0, z: 0 };
for (const f of fs) {
  for (let k = 0; k < 4; k++) {
    cornerOf(f, k, c);
    const s = idx.surfaceAt(c.x, c.z);
    if (s !== 'grass') onRoad++;
    if (isWater(c.x, c.z)) wet++;
  }
  if (idx.surfaceAt(f.x, f.z) !== 'grass') onRoad++;
}
check('no building corner or centre on a road or sidewalk', onRoad === 0, String(onRoad));
check('no building in the water', wet === 0, String(wet));
let over = 0;
const cell = new Map<string, number[]>();
fs.forEach((f, i) => { const k = `${Math.floor(f.x / 100)},${Math.floor(f.z / 100)}`; (cell.get(k) ?? cell.set(k, []).get(k)!).push(i); });
fs.forEach((f, i) => {
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const j of cell.get(`${Math.floor(f.x / 100) + dx},${Math.floor(f.z / 100) + dz}`) ?? []) if (j > i && overlaps(f, fs[j])) over++;
});
check('no two buildings overlap', over === 0, String(over));
const hit = createRoadHit();
let facing = 0;
for (const f of fs) {
  idx.nearestAny(f.x, f.z, hit);
  const e = g.edges[hit.edge], nx = hit.tz * Math.sign(hit.lateral), nz = -hit.tx * Math.sign(hit.lateral); // away from the road
  if (Math.sin(f.rot) * -nx + Math.cos(f.rot) * -nz > 0.7 || !e) facing++;
}
check('building fronts face the nearest street (>= 90 %)', facing >= fs.length * 0.9, `${((facing / fs.length) * 100).toFixed(1)} %`);
check('heights inside the district ranges', fs.every((f) => f.height >= GRAMMAR[f.district].height[0] * 0.25 - 1 && f.height <= GRAMMAR[f.district].height[1]));
const down = fs.filter((f) => f.district === 'downtown').map((f) => f.height).sort((a, b) => b - a);
check('downtown has towers (top 10 over 90 m)', down.length > 10 && down[9] > 90, `${down.slice(0, 3).join(', ')} m`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
