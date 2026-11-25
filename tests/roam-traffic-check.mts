/* Neon Harbor traffic (physics/roamTraffic.ts): on the roads, moving, never faster than the limit, corner grip below
 * the player's (also in rain), stops for red lights, keeps gaps, stops for the player, follows the player around the
 * city, and stays cheap per step. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { RoadIndex, createRoadHit } from '../src/world/roads/roadIndex.ts';
import { RoamTraffic, TRAFFIC_LAT_G, lightFor } from '../src/physics/roamTraffic.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), idx = new RoadIndex(g), hit = createRoadHit();
const D = 1 / 60;

function bendLimit(e: (typeof g.edges)[number], k: number, grip: number): number {
  const ax = e.pts[k * 2] - e.pts[k * 2 - 2], az = e.pts[k * 2 + 1] - e.pts[k * 2 - 1], bx = e.pts[k * 2 + 2] - e.pts[k * 2], bz = e.pts[k * 2 + 3] - e.pts[k * 2 + 1];
  const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), turn = Math.acos(Math.min(1, Math.max(-1, (ax * bx + az * bz) / (la * lb))));
  return turn < 1e-3 ? Infinity : Math.sqrt(TRAFFIC_LAT_G * grip * (Math.min(la, lb) / turn));
}

function run(grip: number, secs: number, px = 0, pz = 0) {
  const tr = new RoamTraffic(g, 40, 5);
  tr.scatter(px, pz);
  let wrongWay = 0, off = 0, fast = 0, bends = 0, overBend = 0, red = 0, nan = 0, close = 0, sumV = 0, n = 0;
  const stopped = tr.agents.map(() => -1); // edge on which the stop line was already judged
  for (let k = 0; k < secs * 60; k++) {
    tr.step(D, px, pz, grip);
    tr.agents.forEach((a, i) => {
      if (!Number.isFinite(tr.x[i]) || !Number.isFinite(a.speed)) nan++;
      const e = g.edges[a.edge];
      if (a.speed > e.limit + 0.01) fast++;
      if (e.oneWay && a.dir < 0) wrongWay++;
      const end = g.nodes[a.dir > 0 ? e.b : e.a], toEnd = a.dir > 0 ? e.length - a.s : a.s;
      if (toEnd < end.radius + 2 && stopped[i] !== a.edge) { // crossing the stop line now: the light must not be red
        stopped[i] = a.edge;
        const hx = Math.sin(tr.h[i]), hz = Math.cos(tr.h[i]); // a car committed on yellow may clear the line in the first second of red
        if (lightFor(end, tr.time, hx, hz) === 2 && lightFor(end, tr.time - 1, hx, hz) === 2 && a.speed > 4) red++;
      }
      for (let v = 1; v + 1 < e.cum.length; v++) if (Math.abs(a.s - e.cum[v]) < 1.5) { // at a bend: speed within the grip cap
        const lim = bendLimit(e, v, grip);
        if (Number.isFinite(lim)) { bends++; if (a.speed > lim * 1.05 + 0.3) overBend++; }
      }
      if (k % 30 === 0) {
        idx.nearest(tr.x[i], tr.z[i], hit);
        if (hit.edge < 0 || hit.dist > g.edges[hit.edge].width / 2 + 0.5) off++;
        for (let j = i + 1; j < tr.agents.length; j++) if (Math.hypot(tr.x[i] - tr.x[j], tr.z[i] - tr.z[j]) < 2.5) close++;
        sumV += a.speed; n++;
      }
    });
  }
  return { tr, wrongWay, off, fast, bends, overBend, red, nan, close, avg: sumV / n };
}
const old = g.nodes.filter((nd) => nd.district === 'oldtown'), ox = old.reduce((a, nd) => a + nd.x, 0) / old.length, oz = old.reduce((a, nd) => a + nd.z, 0) / old.length;

const t0 = performance.now();
const dry = run(1, 120);
const ms = (performance.now() - t0) / (120 * 60);
check('no NaN', dry.nan === 0);
check('cars stay on the tarmac (lane centres)', dry.off === 0, `${dry.off} off-road samples`);
check('cars move (average over 4 m/s)', dry.avg > 4, `${dry.avg.toFixed(1)} m/s`);
check('never above the speed limit', dry.fast === 0, String(dry.fast));
check('nobody runs a red light (more than 1 s into red, at speed)', dry.red === 0, `${dry.red}`);
check('cars keep their distance (rare touches only)', dry.close <= 6, `${dry.close} close pairs`);
check('cheap: under 0.3 ms per step for 40 cars', ms < 0.3, `${(ms * 1000).toFixed(0)} us`);
const bendy = run(1, 90, ox, oz), wet = run(0.72, 90, ox, oz);
check('one-way streets only driven a -> b', dry.wrongWay === 0 && bendy.wrongWay === 0, `${dry.wrongWay + bendy.wrongWay} samples`);
check('old town: no red lights run either', bendy.red === 0, `${bendy.red}`);
check('old town bends: speed within sqrt(0.55 g x R) (below the player car)', bendy.bends > 200 && bendy.overBend === 0, `${bendy.overBend} of ${bendy.bends} bend samples over`);
check('rain: the bend speed cap scales with the weather grip', wet.bends > 200 && wet.overBend === 0, `${wet.overBend} of ${wet.bends} over`);
// spawning out of sight: a player driving at 30 m/s never sees a car appear within 200 m in the cone ahead
{
  const tr = new RoamTraffic(g, 40, 9);
  let px = 0, pz = -1200, inView = 0, spawns = 0;
  tr.scatter(px, pz);
  const wx = tr.agents.map((_, i) => tr.x[i]), wz = tr.agents.map((_, i) => tr.z[i]);
  for (let k = 0; k < 60 * 60; k++) {
    pz += 30 / 60; // north at 108 km/h (through buildings: only the traffic's view of the player matters)
    tr.step(D, px, pz, 1);
    tr.agents.forEach((_a, i) => {
      const jump = Math.hypot(tr.x[i] - wx[i], tr.z[i] - wz[i]) > 25; wx[i] = tr.x[i]; wz[i] = tr.z[i];
      if (!jump || k < 2) return;
      spawns++;
      const rx = tr.x[i] - px, rz = tr.z[i] - pz, rd = Math.hypot(rx, rz);
      if (rd < 200 && rz / rd > 0.6) inView++;
    });
  }
  check('traffic never pops in ahead of a moving player', spawns > 20 && inView === 0, `${inView} of ${spawns} respawns in view`);
}
// the player stands in a lane right ahead of a car: it stops behind
{
  const tr = new RoamTraffic(g, 1, 9);
  tr.scatter(0, 0);
  const a = tr.agents[0], e = g.edges.find((x) => x.kind === 'avenue' && x.cum.length === 2 && x.length > 120)!;
  a.edge = e.id; a.dir = 1; a.lane = 0; a.s = 10; a.speed = 12; tr.poses();
  const hx = Math.sin(tr.h[0]), hz = Math.cos(tr.h[0]), px = tr.x[0] + hx * 50, pz = tr.z[0] + hz * 50;
  for (let k = 0; k < 60 * 10; k++) tr.step(D, px, pz, 1);
  const d = Math.hypot(tr.x[0] - px, tr.z[0] - pz);
  check('stops behind the player instead of driving through', d > 4 && a.speed < 0.5, `${d.toFixed(1)} m away, ${a.speed.toFixed(1)} m/s`);
}
// the player drives 1.5 km away: traffic comes along
{
  const tr = dry.tr;
  for (let k = 0; k < 60 * 2; k++) tr.step(D, 1500, 0, 1);
  const far = tr.agents.filter((_, i) => Math.hypot(tr.x[i] - 1500, tr.z[i]) > 420).length;
  check('traffic follows the player across the city', far === 0, `${far} cars left behind`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
