/* Free-roam contact (physics/roamContact.ts) with a real car: drives on the avenue with full grip, grass is slower,
 * buildings are walls (never inside one), the quay stops the car at the water, the Bay Bridge carries it over the water
 * on its deck, and the world border holds. */
import { CARS } from '../src/data/cars.ts';
import { snagStats } from './lab/roam-snag.mts';
import { offroadRun } from './lab/roam-offroad.mts';
import { generateRoads as genRoads2 } from '../src/world/roads/generate.ts';
import { generateFootprints as genFp2 } from '../src/world/open/footprints.ts';
import { CarController } from '../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { RoamContact } from '../src/physics/roamContact.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createNeutralInput } from '../src/types/game.ts';
import { generateRoads } from '../src/world/roads/generate.ts';
import { generateFootprints } from '../src/world/open/footprints.ts';
import { isWater } from '../src/data/world/districtMap.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), fs = generateFootprints(g), rc = new RoamContact(g, fs);
const car = new CarController(applyTuning(createDefaultTuning(), CARS.find((c) => c.id === 'evo')!.tuning));
const gas = { ...createNeutralInput(), throttle: 1 };
const drive = (sec: number, input = gas, each?: () => void): void => {
  for (let i = 0; i < sec * 60; i++) { car.step(1 / 60, input, WEATHER.CLEAR); rc.update(car); each?.(); }
};
const inside = (x: number, z: number): boolean => fs.some((f) => {
  const fx = Math.sin(f.rot), fz = Math.cos(f.rot), dx = x - f.x, dz = z - f.z;
  return Math.abs(dx * fz - dz * fx) < f.hw - 0.05 && Math.abs(dx * fx + dz * fz) < f.hd - 0.05;
});

// 1. along a long straight avenue
const av = g.edges.filter((e) => e.kind === 'avenue' && e.pts.length === 4).sort((a, b) => b.length - a.length)[0];
const p = { x: 0, z: 0 };
const head = rc.roads.pointAt(av.id, 10, 0, p);
car.reset(p.x, p.z, head);
let minGrip = 1;
drive(Math.min(5, av.length / 40), gas, () => { minGrip = Math.min(minGrip, car.surfaceGrip); });
check('on the avenue: full asphalt grip, height follows the road', minGrip === 1 && Number.isFinite(rc.groundY) && !rc.offroad, `grip ${minGrip}, y ${rc.groundY.toFixed(1)}`);
const onRoadSpeed = car.state.speed;

// 2. grass
const grassAt = (): { x: number; z: number } => { for (let x = -2900; x < 2900; x += 37) for (let z = -2900; z < 2900; z += 41) if (!isWater(x, z) && rc.roads.surfaceAt(x, z) === 'grass' && !inside(x, z) && rc.roads.surfaceAt(x + 40, z) === 'grass') return { x, z }; return { x: 0, z: 0 }; };
const gp = grassAt();
car.reset(gp.x, gp.z, Math.PI / 2);
drive(1.5);
check('grass slows the car (less grip, more drag)', car.surfaceGrip < 1 && car.state.speed < onRoadSpeed, `${car.state.speed.toFixed(1)} vs ${onRoadSpeed.toFixed(1)} m/s`);

// 3. straight into building fronts
let entered = 0, hits = 0;
let tried = 0;
for (const f of fs.filter((_, i) => i % 97 === 7)) {
  const fx = Math.sin(f.rot), fz = Math.cos(f.rot), sx = f.x + fx * (f.hd + 9), sz = f.z + fz * (f.hd + 9); // mid-street, nose at the front
  if (inside(sx, sz) || tried >= 20) continue;
  tried++;
  car.reset(sx, sz, f.rot + Math.PI);
  let hit = false;
  drive(4, gas, () => { if (inside(car.state.position.x, car.state.position.z)) entered++; if (rc.impact > 1) hit = true; });
  if (hit) hits++;
}
check('driving into buildings: never ends up inside one', entered === 0, `${entered} steps inside`);
check('...and the hit is felt (impact reported)', tried === 20 && hits >= 15, `${hits}/${tried}`);

// 4. the quay: from land straight toward a water cell
let wet = 0;
const quay = fs.find((f) => f.district === 'harbour') ? (() => { for (let x = -2900; x < 2900; x += 8) for (let z = -2900; z < 2900; z += 8) if (!isWater(x, z) && isWater(x, z - 30) && rc.roads.surfaceAt(x, z) !== 'grass' && !inside(x, z)) return { x, z }; return null; })() : null;
if (quay) {
  car.reset(quay.x, quay.z, Math.PI); // facing -z, into the water
  drive(4, gas, () => { if (isWater(car.state.position.x, car.state.position.z) && rc.roads.surfaceAt(car.state.position.x, car.state.position.z) === 'grass') wet++; });
}
check('the quay edge stops the car at the water', !!quay && wet === 0, quay ? `${wet} steps in the water` : 'no quay found');

// 5. the Bay Bridge
const br = g.edges.find((e) => e.kind === 'bridge')!;
const bh = rc.roads.pointAt(br.id, 30, 0, p);
car.reset(p.x, p.z, bh);
let maxY = 0, overWater = 0;
drive(br.length / 45, gas, () => { maxY = Math.max(maxY, rc.groundY); if (isWater(car.state.position.x, car.state.position.z)) overWater++; });
check('the bridge carries the car over the water on its deck', overWater > 60 && maxY > 8, `${overWater} steps over water, deck up to ${maxY.toFixed(1)} m`);

// 6. the world border
car.reset(g.half - 40, 0, Math.PI / 2); // heading +x toward the edge
let out = 0;
drive(5, gas, () => { if (Math.abs(car.state.position.x) > g.half) out++; });
check('the world border holds', out === 0);
// box-vs-box contact (physics/obbHit): 200 drives into building corners and faces never leave the car inside a building
// camera line of sight: through a tall building the free part is short, along an open road it is all free
{
  const gg = genRoads2(7), ff = genFp2(gg), cc = new RoamContact(gg, ff);
  const b = ff.find((q) => q.height > 8 && q.hw > 6)!, fx = Math.sin(b.rot), fz = Math.cos(b.rot);
  const out = cc.rayFree(b.x + fz * (b.hw + 4), b.z - fx * (b.hw + 4), b.x - fz * (b.hw + 4), b.z + fx * (b.hw + 4), 3);
  check('camera ray through a building is cut at its wall', out > 0 && out < 0.2, out.toFixed(2));
  check('camera ray over a low height sees above the roof line only when higher', cc.rayFree(b.x + fz * (b.hw + 4), b.z - fx * (b.hw + 4), b.x - fz * (b.hw + 4), b.z + fx * (b.hw + 4), b.height + 1) === 1);
}
const orr = offroadRun(); // leaving the street at 100 km/h: no glue, no jolt at the kerb
check('off the kerb: a soft slow-down (under 0.9 g) without a jolt', orr.maxDecel < 9 && orr.jolt < 5 && orr.kmh > 50, `${orr.kmh.toFixed(0)} km/h after 1.5 s, max ${orr.maxDecel.toFixed(1)} m/s2, jolt ${orr.jolt.toFixed(1)}`);
const sn = snagStats(200);
check('no clipping into buildings (box contact, seam fallback)', sn.clipMax < 0.05, `max ${sn.clipMax.toFixed(2)} m, ${sn.stuckRuns} head-on stops`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
