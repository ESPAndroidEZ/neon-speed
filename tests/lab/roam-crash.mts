import { generateRoads } from '../../src/world/roads/generate.ts';
import { RoamContact } from '../../src/physics/roamContact.ts';
import { RoamTraffic } from '../../src/physics/roamTraffic.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { CARS } from '../../src/data/cars.ts';
import { fillEnv, type PhysicsEnv } from '../../src/physics/weatherLevels.ts';
import type { Footprint } from '../../src/types/world.ts';

/* Crashes in the city: speed after a head-on wall hit, and after rear-ending a moving traffic car (no throw-back).
   npx tsx tests/lab/roam-crash.mts. `crashRuns` is reused by tests/roam-contact-check.mts. */
const env: PhysicsEnv = fillEnv({ name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level: 'NORMAL', yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, 'CLEAR', 'NORMAL');
const idle = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
export function crashRuns(): { wall60: number; wall120: number; rear: number; rearOther: number } {
  const g = generateRoads(7);
  const wall: Footprint = { x: 0, z: 30, hw: 20, hd: 5, rot: 0, height: 10, style: 0, district: 'downtown' };
  const tu = applyTuning(createDefaultTuning(), CARS[2].tuning);
  const hit = (kmh: number): number => {
    const c = new RoamContact(g, [wall]), car = new CarController(tu);
    car.reset(0, 0, 0); car.nudge(0, 0, 0, kmh / 3.6, 0);
    let low = Infinity;
    for (let i = 0; i < 90; i++) { car.step(1 / 60, idle, env); c.update(car); low = Math.min(low, car.state.speed); }
    return low * 3.6; // most negative forward speed after the hit
  };
  // rear-end: a traffic car 30 m ahead driving 15 m/s the same way; we come at 34 m/s
  const tr = new RoamTraffic(g, 1, 1), e = g.edges.find((x) => x.kind === 'avenue' && x.length > 120 && x.pts.length === 4 && !x.oneWay)!;
  tr.scatter(e.pts[0], e.pts[1]);
  const a = tr.agents[0]; a.edge = e.id; a.dir = 1; a.lane = 0; a.s = 45; a.speed = 15; tr.poses();
  const c = new RoamContact(g, []); c.traffic = tr;
  const h = tr.h[0], car = new CarController(tu);
  car.reset(tr.x[0] - Math.sin(h) * 30, tr.z[0] - Math.cos(h) * 30, h); car.nudge(0, 0, Math.sin(h) * 34, Math.cos(h) * 34, 0);
  let low = Infinity, at = -1;
  for (let i = 0; i < 150; i++) {
    tr.step(1 / 60, car.state.position.x, car.state.position.z, 1);
    car.step(1 / 60, idle, env); c.update(car);
    if (c.hitCar >= 0 && at < 0) at = i;
    if (at >= 0 && i < at + 60) low = Math.min(low, car.state.speed);
  }
  if (at < 0) low = NaN; // no hit: the lab missed
  return { wall60: hit(60), wall120: hit(120), rear: low * 3.6, rearOther: tr.agents[0].speed * 3.6 };
}
if (process.argv[1]?.endsWith('roam-crash.mts')) { const r = crashRuns(); console.log(`head-on 60 km/h -> ${r.wall60.toFixed(0)}, 120 -> ${r.wall120.toFixed(0)} km/h; rear-end at 122 into a 54 km/h car -> ${r.rear.toFixed(0)} km/h`); }
