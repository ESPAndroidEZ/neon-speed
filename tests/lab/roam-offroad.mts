import { generateRoads } from '../../src/world/roads/generate.ts';
import { generateFootprints } from '../../src/world/open/footprints.ts';
import { RoamContact } from '../../src/physics/roamContact.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { CARS } from '../../src/data/cars.ts';
import { fillEnv, type PhysicsEnv } from '../../src/physics/weatherLevels.ts';

/* Leaving the street in the city: speed after 1.5 s off the kerb from 100 km/h, and the largest step change in deceleration
   (a jolt) while crossing the sidewalk edge. npx tsx tests/lab/roam-offroad.mts. Exported for tests/roam-contact-check. */
const env: PhysicsEnv = fillEnv({ name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level: 'NORMAL', yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, 'CLEAR', 'NORMAL');
export function offroadRun(): { kmh: number; jolt: number; maxDecel: number } {
  const g = generateRoads(7), c = new RoamContact(g, []); // no buildings: only the ground
  const e = g.edges.find((x) => (x.kind === 'street' || x.kind === 'avenue') && x.length > 60 && !x.ys)!;
  const ax = e.pts[0], az = e.pts[1], tx = e.pts[2] - ax, tz = e.pts[3] - az, l = Math.hypot(tx, tz), x0 = ax + tx * 0.5, z0 = az + tz * 0.5;
  const car = new CarController(applyTuning(createDefaultTuning(), CARS[2].tuning));
  // heading straight across the road, outward: perpendicular to the street
  const h = Math.atan2(tz / l, -tx / l);
  car.reset(x0, z0, h);
  const inp = { throttle: 1, brake: 0, steer: 0, handbrake: false, nitro: false };
  car.nudge(0, 0, Math.sin(h) * 27.8, Math.cos(h) * 27.8, 0); // 100 km/h, straight off the road
  let last = car.state.speed, prevA = 0, jolt = 0, maxDecel = 0, t = 0;
  inp.throttle = 0;
  for (let i = 0; i < 90 + 120; i++) {
    car.step(1 / 60, inp, env); c.update(car);
    const a = (car.state.speed - last) * 60; last = car.state.speed;
    if (i > 1) { jolt = Math.max(jolt, Math.abs(a - prevA)); maxDecel = Math.max(maxDecel, -a); }
    prevA = a; if (c.offroad) t++;
    if (t >= 90) break;
  }
  return { kmh: car.state.speed * 3.6, jolt, maxDecel };
}
if (process.argv[1]?.endsWith('roam-offroad.mts')) { const r = offroadRun(); console.log(`after 1.5 s off-road: ${r.kmh.toFixed(0)} km/h, max decel ${r.maxDecel.toFixed(1)} m/s2, largest one-step decel change ${r.jolt.toFixed(1)} m/s2`); }
