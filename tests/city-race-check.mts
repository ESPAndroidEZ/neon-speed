/* City races (core/cityRace.ts, W5.5): every district with streets gets a GPS loop that is a valid race map (the same
 * rules as the hand-made maps), follows Neon Harbor's real streets, starts at a junction on the loop, never uses the
 * motorway, is the same every time, and plans fast enough to do when the city is built. Closed roads in findRoute are honoured. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { findRoute } from '../src/core/route.ts';
import { CITY_PREFIX, isCityTrack, placeCityRaces } from '../src/core/cityRace.ts';
import { buildTrack } from '../src/data/tracks/index.ts';
import { validateTrack } from '../src/world/trackValidate.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7);

const t0 = performance.now();
const races = placeCityRaces(g);
const ms = performance.now() - t0;
const districts = new Set(g.nodes.filter((n) => n.edges.length).map((n) => n.district));
check('one race per district with streets', races.length === districts.size && new Set(races.map((r) => r.district)).size === races.length, `${races.length} of ${districts.size}: ${races.map((r) => r.id).join(', ')}`);
check('ids are city ids', races.every((r) => isCityTrack(r.id) && r.def.id === r.id && r.id === CITY_PREFIX + r.district) && !isCityTrack('kestrel'));
check('planning all races is quick (done once when the city is built)', ms < 600, `${ms.toFixed(0)} ms`);

// the street centre lines as points every ~8 m, for "does the race map follow the city"
const road: number[] = [];
for (const e of g.edges) for (let k = 0; k < e.pts.length / 2 - 1; k++) {
  const x0 = e.pts[k * 2], z0 = e.pts[k * 2 + 1], x1 = e.pts[k * 2 + 2], z1 = e.pts[k * 2 + 3], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 8));
  for (let i = 0; i < n; i++) road.push(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n);
}
const nearRoad = (x: number, z: number): number => { let d = Infinity; for (let i = 0; i < road.length; i += 2) d = Math.min(d, (road[i] - x) ** 2 + (road[i + 1] - z) ** 2); return Math.sqrt(d); };

for (const r of races) {
  const tr = buildTrack(r.def);
  const problems = validateTrack(tr, { minLength: 1000, maxLength: 2800, sprint: false });
  check(`${r.id}: valid race map (${tr.length.toFixed(0)} m, ${r.def.vertices.length} corners)`, problems.length === 0, problems.map((p) => `${p.check}: ${p.detail}`).join('; '));
  check(`${r.id}: circuit, 2 laps, a name`, r.def.type === 'circuit' && r.def.laps === 2 && r.def.name.length > 3 && Math.abs(r.length - tr.length) < 1);
  let off = 0, worst = 0;
  for (let i = 0; i < tr.samples.length; i += 5) {
    const p = tr.samples[i].position, d = nearRoad(p.x + r.ox, p.z + r.oz);
    worst = Math.max(worst, d);
    if (d > 12) off++;
  }
  const share = off / Math.ceil(tr.samples.length / 5);
  check(`${r.id}: follows the city's streets`, share < 0.05 && worst < 40, `${(share * 100).toFixed(1)} % of the lap more than 12 m off a street, worst ${worst.toFixed(1)} m`);
  check(`${r.id}: start marker on the loop`, nearRoad(r.x, r.z) < 2 && Math.min(...tr.samples.map((s) => Math.hypot(s.position.x + r.ox - r.x, s.position.z + r.oz - r.z))) < 25, `${r.x.toFixed(0)}, ${r.z.toFixed(0)}`);
  const c = Math.hypot(...tr.samples.reduce((a, s) => [a[0] + s.position.x / tr.samples.length, a[1] + s.position.z / tr.samples.length], [0, 0]));
  check(`${r.id}: map centred near the origin`, c < 300, `centre ${c.toFixed(0)} m from 0,0`);
}

// no motorway, airport or bridge in a race (findRoute's closed roads)
const fast = new Set(g.edges.filter((e) => e.kind === 'highway' || e.kind === 'runway' || e.kind === 'bridge').map((e) => e.id));
const again = placeCityRaces(g);
check('the same races every time (same city seed)', JSON.stringify(again.map((r) => r.def.vertices)) === JSON.stringify(races.map((r) => r.def.vertices)));

// findRoute: a closed edge or junction is never used, and closing nothing changes nothing
let usedClosed = 0, same = 0, tries = 0;
for (let k = 0; k < 40; k++) {
  const a = (k * 97) % g.nodes.length, b = (k * 389 + 11) % g.nodes.length;
  const base = findRoute(g, a, b);
  if (!base || base.edges.length < 3) continue;
  tries++;
  if (JSON.stringify(findRoute(g, a, b, new Uint8Array(g.edges.length), new Uint8Array(g.nodes.length))) === JSON.stringify(base)) same++;
  const se = new Uint8Array(g.edges.length), sn = new Uint8Array(g.nodes.length);
  se[base.edges[1]] = 1;
  sn[base.nodes[Math.floor(base.nodes.length / 2)]] = 1;
  const alt = findRoute(g, a, b, se, sn);
  if (alt && (alt.edges.includes(base.edges[1]) || alt.nodes.slice(1, -1).includes(base.nodes[Math.floor(base.nodes.length / 2)]))) usedClosed++;
}
check('findRoute: closed roads and junctions are avoided', tries > 10 && usedClosed === 0, `${tries} routes, ${usedClosed} used a closed road`);
check('findRoute: empty closures give the same route', same === tries, `${same}/${tries}`);
check('no race uses the motorway, the runway or the bridge', fast.size > 0 && races.every((r) => r.edges.length > 3 && r.edges.every((e) => !fast.has(e))), `${fast.size} fast roads closed`);

// start rings stay clear of the other activities (a drift zone, a speed camera or the car meet would trigger too)
import { placeDriftZones } from '../src/core/driftZones.ts';
import { placeSpeedTraps } from '../src/core/speedTraps.ts';
import { placeCarMeet } from '../src/core/carMeet.ts';
import { RING } from '../src/game/cityRaces.ts';
{
  const zones = placeDriftZones(g), traps = placeSpeedTraps(g), meet = placeCarMeet(g, zones);
  let clash = '';
  for (const r of races) {
    for (const z of zones) if (Math.hypot(z.x - r.x, z.z - r.z) < z.r + RING + 5) clash += ` ${r.id}~zone`;
    for (const c of traps) if (Math.hypot(c.x - r.x, c.z - r.z) < RING + 15) clash += ` ${r.id}~camera`;
    if (meet && Math.hypot(meet.x - r.x, meet.z - r.z) < meet.r + RING + 5) clash += ` ${r.id}~meet`;
  }
  check('start rings clear of drift zones, cameras and the car meet', clash === '', clash.trim());
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
