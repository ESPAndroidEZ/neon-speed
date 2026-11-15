// Precipitation (rain / snow) CPU side: many frames with camera cuts and high speed. Uniforms stay finite, the pools
// keep a constant size and the same buffers (no per-frame allocation), and the world-space wrap keeps every particle
// inside its volume after a cut (nothing pops: positions are a pure function of seed, drift and the box).
import { PerspectiveCamera, Scene, type BufferAttribute, type InstancedBufferGeometry } from 'three';
import { particleWorld, type PrecipBox, type PrecipState } from '../src/world/precipMath.ts';
import { precipCover } from '../src/world/precipCover.ts';
import { RAIN_BOX, SNOW_BOX, createWeatherFx } from '../src/world/weatherFx.ts';
import { WEATHER } from '../src/physics/weather.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};

const scene = new Scene();
const fx = createWeatherFx(scene);
const cam = new PerspectiveCamera(65, 16 / 9, 0.1, 2000);
const meshes = fx.debug.meshes;
const geos = meshes.map((m) => m.geometry);
const seeds = meshes.map((m) => m.geometry.getAttribute('seed') as BufferAttribute | undefined);
const counts = meshes.map((m) => (m.geometry as InstancedBufferGeometry).instanceCount);
const uniformObjs = meshes.map((m) => Object.values(m.material.uniforms).map((u) => u.value));

const finite = (v: unknown): boolean => {
  if (typeof v === 'number') return Number.isFinite(v);
  if (v && typeof v === 'object' && 'toArray' in v) return (v as { toArray(): number[] }).toArray().every(Number.isFinite);
  return true;
};

const P = { x: 0, y: 0, z: 0 };
let worstOut = 0;
const inside = (s: PrecipState, box: PrecipBox, arr: ArrayLike<number>): void => {
  for (let i = 0; i < arr.length; i += 4 * 7) {
    particleWorld(s, box, arr[i], arr[i + 1], arr[i + 2], P);
    const ox = Math.max(0, Math.abs(P.x - s.cx) - box.sx / 2);
    const oy = Math.max(0, Math.abs(P.y - s.cy) - box.sy / 2);
    const oz = Math.max(0, Math.abs(P.z - s.cz) - box.sz / 2);
    worstOut = Math.max(worstOut, ox, oy, oz);
  }
};

let allFinite = true;
let sameObjs = true;
let maxSpeed = 0;
let cutStreak = 0;
const D = 1 / 60;
let x = 0;
let z = 0;
let h = 0;
for (const w of ['RAIN', 'SNOW'] as const) {
  fx.setProfile(WEATHER[w]);
  fx.setIntensity(1);
  for (let f = 0; f < 3000; f++) {
    // 45 m/s (162 km/h) along a winding heading, a camera cut every 400 frames (teleport up to 3 km), odd frame times
    h += Math.sin(f * 0.01) * 0.01;
    x += Math.sin(h) * 45 * D;
    z += Math.cos(h) * 45 * D;
    if (f % 400 === 399) {
      x += 2500 * Math.sin(f);
      z -= 3000 * Math.cos(f * 0.3);
    }
    const y = 2 + 40 * Math.sin(f * 0.002) + (f % 997 === 0 ? 300 : 0);
    cam.position.set(x - Math.sin(h) * 6, y, z - Math.cos(h) * 6);
    cam.lookAt(x, y - 1, z);
    cam.updateMatrixWorld();
    precipCover.valid = f % 3 !== 0; // cover toggling must not break anything
    precipCover.inside = f % 500 < 60 ? 1 : 0;
    precipCover.tunHalf = 10;
    fx.update(f % 50 === 0 ? 0.2 : f % 7 === 0 ? 0 : D, cam, 45);
    const s = w === 'RAIN' ? fx.debug.rain : fx.debug.snow;
    if (s.cut) cutStreak++;
    maxSpeed = Math.max(maxSpeed, Math.hypot(s.vx, s.vy, s.vz));
    for (const m of meshes) for (const u of Object.values(m.material.uniforms)) if (!finite(u.value)) allFinite = false;
    meshes.forEach((m, i) => {
      if (m.geometry !== geos[i] || m.geometry.getAttribute('seed') !== seeds[i] || Object.values(m.material.uniforms).some((u, k) => u.value !== uniformObjs[i][k] && typeof u.value === 'object')) sameObjs = false;
    });
    if (f % 25 === 0 || s.cut) {
      inside(fx.debug.rain, RAIN_BOX, seeds[0]!.array);
      inside(fx.debug.snow, SNOW_BOX, seeds[1]!.array);
    }
  }
}
check('uniforms finite through cuts, height jumps, dt 0 and 0.2 s', allFinite, `${fx.debug.rain.cuts + fx.debug.snow.cuts} cuts seen`);
check('particle pools keep a constant size', meshes.every((m, i) => (m.geometry as InstancedBufferGeometry).instanceCount === counts[i]), counts.join(' / '));
check('no per-frame allocation (same geometry, seed buffers and uniform objects)', sameObjs, `${meshes.length} meshes`);
check('every particle inside its volume after each cut (no pop)', worstOut < 1e-3, `worst ${worstOut.toExponential(1)} m outside`);
check('camera velocity ignores cuts (no giant streaks)', maxSpeed <= 90.01 && cutStreak > 0, `max ${maxSpeed.toFixed(1)} m/s, ${cutStreak} cut frames`);

// world-space: a camera that moves a little must not move the particles (only drift and the wrap window change)
const s = fx.debug.rain;
const before = { x: 0, y: 0, z: 0 };
particleWorld(s, RAIN_BOX, 0.5, 0.5, 0.5, before);
const save = { cx: s.cx, cy: s.cy, cz: s.cz };
s.cx += 0.7;
s.cz -= 0.4;
particleWorld(s, RAIN_BOX, 0.5, 0.5, 0.5, P);
check('particles stay put in the world when the camera moves (not glued to the screen)', Math.hypot(P.x - before.x, P.y - before.y, P.z - before.z) < 1e-6, 'centre moved 0.8 m');
Object.assign(s, save);

fx.dispose();
check('dispose removes every mesh', scene.children.length === 0, `${scene.children.length} left`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
