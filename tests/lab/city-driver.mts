import { generateRoads } from '../../src/world/roads/generate.ts';
import { generateFootprints } from '../../src/world/open/footprints.ts';
import { RoamContact } from '../../src/physics/roamContact.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { CARS } from '../../src/data/cars.ts';
import { fillEnv, type PhysicsEnv } from '../../src/physics/weatherLevels.ts';
import { findRoute } from '../../src/core/route.ts';
import { CityDriver, cityPath } from '../../src/physics/cityDriver.ts';
import { createNeutralInput } from '../../src/types/game.ts';

/* The in-city rival on real routes: does it reach the end, how fast, how often does it hit walls or stall?
   npx tsx tests/lab/city-driver.mts [routes] [car]. `driveRoutes` is reused by tests/city-driver-check.mts. */
const env: PhysicsEnv = fillEnv({ name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level: 'NORMAL', yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, 'CLEAR', 'NORMAL');
export interface DriveStats { routes: number; finished: number; avgKmh: number; hitsPerKm: number; worst: string }
export function driveRoutes(n = 12, carId = 'civic'): DriveStats {
  const g = generateRoads(7), fs = generateFootprints(g), c = new RoamContact(g, fs);
  const tu = applyTuning(createDefaultTuning(), CARS.find((x) => x.id === carId)!.tuning);
  let finished = 0, km = 0, secs = 0, hits = 0, routes = 0, worst = '';
  const nodes = g.nodes.filter((x) => x.edges.length >= 3 && x.district !== 'bay');
  for (let r = 0; r < n; r++) {
    const a = nodes[(r * 131) % nodes.length];
    const b = nodes.find((q) => { const d = Math.hypot(q.x - a.x, q.z - a.z); return d > 900 && d < 1300 && q.district === a.district; }) ?? nodes[(r * 977 + 5) % nodes.length];
    const rt = findRoute(g, a.id, b.id);
    if (!rt) continue;
    const path = cityPath(g, rt.nodes, rt.edges), drv = new CityDriver(path), car = new CarController(tu), inp = createNeutralInput();
    car.reset(path.x[0], path.z[0], Math.atan2(path.x[2] - path.x[0], path.z[2] - path.z[0]));
    let t = 0, h = 0, cool = 0, done = false;
    for (; t < 240 && !done; t += 1 / 60) {
      drv.drive(car, inp); car.step(1 / 60, inp, env); c.update(car);
      cool -= 1 / 60; if (c.impact > 3 && cool <= 0) { h++; cool = 0.5; }
      done = drv.distance > path.length - 15;
    }
    routes++; km += drv.distance / 1000; secs += t; hits += h;
    if (done) finished++; else worst += ` r${r}@${Math.round(drv.distance)}/${Math.round(path.length)}m`;
  }
  return { routes, finished, avgKmh: (km / Math.max(1, secs)) * 3600, hitsPerKm: hits / Math.max(0.01, km), worst };
}
if (process.argv[1]?.endsWith('city-driver.mts')) {
  const s = driveRoutes(Number(process.argv[2] ?? 12), process.argv[3] ?? 'civic');
  console.log(`routes ${s.routes} finished ${s.finished}  avg ${s.avgKmh.toFixed(0)} km/h  wall hits ${s.hitsPerKm.toFixed(2)}/km  unfinished:${s.worst}`);
}
