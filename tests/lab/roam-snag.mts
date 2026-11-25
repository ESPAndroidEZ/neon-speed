import { generateRoads } from '../../src/world/roads/generate.ts';
import { generateFootprints } from '../../src/world/open/footprints.ts';
import { RoamContact } from '../../src/physics/roamContact.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../src/physics/carTuning.ts';
import { CARS } from '../../src/data/cars.ts';
import { fillEnv, type PhysicsEnv } from '../../src/physics/weatherLevels.ts';
import type { Footprint } from '../../src/types/world.ts';

/* City wall lab: drive a car into building corners and faces at several angles and speeds, then measure
   (a) the deepest overlap of the car's box with the building after contact (should be ~0: no clipping),
   (b) steps stuck against the wall, (c) speed kept along the wall after a glancing hit.
   Usage: npx tsx tests/lab/roam-snag.mts [n]   Exported `snagStats` is reused by tests/roam-contact-check.mts. */
const D = 1 / 60;
const env: PhysicsEnv = fillEnv({ name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level: 'NORMAL', yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, 'CLEAR', 'NORMAL');

/** Depth (m) the car box (half 0.92 x 2.1) reaches into footprint f: SAT, 0 when apart. */
export function overlapDepth(x: number, z: number, h: number, f: Footprint): number {
  const ax = [[Math.cos(h), -Math.sin(h)], [Math.sin(h), Math.cos(h)], [Math.cos(f.rot), -Math.sin(f.rot)], [Math.sin(f.rot), Math.cos(f.rot)]];
  const ca = [Math.cos(h), -Math.sin(h)], cb = [Math.sin(h), Math.cos(h)];
  const fa = [Math.cos(f.rot), -Math.sin(f.rot)], fb = [Math.sin(f.rot), Math.cos(f.rot)];
  let best = Infinity;
  for (const [ux, uz] of ax) {
    const rc = 0.92 * Math.abs(ca[0] * ux + ca[1] * uz) + 2.1 * Math.abs(cb[0] * ux + cb[1] * uz);
    const rf = f.hw * Math.abs(fa[0] * ux + fa[1] * uz) + f.hd * Math.abs(fb[0] * ux + fb[1] * uz);
    const d = Math.abs((x - f.x) * ux + (z - f.z) * uz);
    best = Math.min(best, rc + rf - d);
  }
  return Math.max(0, best);
}

export interface SnagStats { runs: number; clipMax: number; clipMean: number; stuckRuns: number; keptGlancing: number }

export function snagStats(n = 60): SnagStats {
  const g = generateRoads(7), fs = generateFootprints(g), contact = new RoamContact(g, fs);
  const tu = applyTuning(createDefaultTuning(), CARS[0].tuning);
  let clipMax = 0, clipSum = 0, stuck = 0, runs = 0, kept = 0, glancing = 0;
  const inp = { throttle: 1, brake: 0, steer: 0, handbrake: false, nitro: false };
  for (let i = 0; i < n; i++) {
    const f = fs[(i * 7919) % fs.length];
    if (f.hw < 4 || f.hd < 4) continue;
    // aim at a corner (even runs) or the middle of a face (odd runs), from 14 m out, at an angle
    const corner = i % 2 === 0, k = i % 4, sx = k & 1 ? 1 : -1, sz = k & 2 ? 1 : -1;
    const lx = corner ? sx * f.hw : sx * f.hw, lz = corner ? sz * f.hd : 0;
    const fx = Math.sin(f.rot), fz = Math.cos(f.rot);
    const tx = f.x + lx * fz + lz * fx, tz = f.z - lx * fx + lz * fz; // local -> world (x axis (fz,-fx), z axis (fx,fz))
    const ang = Math.atan2(tx - f.x, tz - f.z) + [-1.22, -0.6, 0, 0.6, 1.22][i % 5]; // outward direction, bent (+-1.22 rad = about 20 deg to the wall: a glancing hit)
    const sx0 = tx + Math.sin(ang) * 14, sz0 = tz + Math.cos(ang) * 14, head = ang + Math.PI;
    if (fs.some((q) => Math.hypot(q.x - sx0, q.z - sz0) < 60 && overlapDepth(sx0, sz0, head, q) > 0)) continue; // the start spot must be clear (lab, not game)
    const glance = Math.abs((i % 5) - 2) === 2;
    const car = new CarController(tu);
    car.reset(sx0, sz0, head);
    const v = 12 + (i % 3) * 10;
    car.nudge(0, 0, Math.sin(head) * v, Math.cos(head) * v, 0);
    let clip = 0, still = 0, hit = false, after = 0, vHit = 0, vHalf = -1, sHit = -1;
    for (let s = 0; s < 150; s++) {
      car.step(D, inp, env);
      contact.update(car);
      const p = car.state.position;
      let o = 0;
      for (const q of [f]) o = Math.max(o, overlapDepth(p.x, p.z, car.state.heading, q));
      clip = Math.max(clip, o);
      if (contact.impact > 0.5 && !hit) { hit = true; vHit = Math.abs(car.state.speed); sHit = s; }
      if (hit && s === sHit + 30) vHalf = Math.abs(car.state.speed);
      if (hit && Math.abs(car.state.speed) < 1.5) still++;
      if (hit && s > 140) after = Math.abs(car.state.speed);
    }
    runs++; clipMax = Math.max(clipMax, clip); clipSum += clip;
    if (process.env.SNAG_DEBUG && clip > 0.3) console.log(`run ${i} clip ${clip.toFixed(2)} v ${v} corner ${corner} hw ${f.hw.toFixed(1)} hd ${f.hd.toFixed(1)} start-overlap ${overlapDepth(sx0, sz0, head, f).toFixed(2)}`);
    if (still > 60) stuck++;
    if (glance) { glancing++; if (after > 5) kept++; if (process.env.SNAG_GLANCE && hit) console.log(`glance run ${i} corner ${corner} v ${v} at hit ${vHit.toFixed(1)} 0.5 s later ${vHalf.toFixed(1)} end ${after.toFixed(1)}`); }
  }
  return { runs, clipMax, clipMean: clipSum / Math.max(1, runs), stuckRuns: stuck, keptGlancing: kept / Math.max(1, glancing) };
}

if (process.argv[1]?.endsWith('roam-snag.mts')) {
  const s = snagStats(Number(process.argv[2] ?? 120));
  console.log(`runs ${s.runs}  clip max ${s.clipMax.toFixed(2)} m  mean ${s.clipMean.toFixed(2)} m  stuck runs ${s.stuckRuns}  glancing hits that keep > 18 km/h ${(s.keptGlancing * 100).toFixed(0)} %`);
}
