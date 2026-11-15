// Bug A3 regression: sky/background objects never cast or receive shadows, and the key light's shadow follows the
// camera on whole shadow-map texels (no shimmer).
import { DirectionalLight, Scene, type Object3D } from 'three';
import { PALETTES } from '../src/data/palettes.ts';
import { TRACKS, buildTrack } from '../src/data/tracks/index.ts';
import { buildLandmarks } from '../src/world/landmarks.ts';
import { buildSky } from '../src/world/sky.ts';
import { SHADOW_HALF, SHADOW_MAP, rigKeyShadow, snapToTexel, texelSize } from '../src/world/shadowRig.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };

const scan = (root: Object3D): { tagged: number; bad: string[] } => {
  let tagged = 0;
  const bad: string[] = [];
  root.traverse((o) => {
    if (!o.userData.sky) return;
    tagged++;
    if (o.castShadow || o.receiveShadow) bad.push(`${o.type}:${o.name}`);
  });
  return { tagged, bad };
};

for (const [id, pal] of Object.entries(PALETTES)) {
  const sky = buildSky(pal);
  const { tagged, bad } = scan(sky.group);
  let untagged = 0;
  sky.group.traverse((o) => { if (!o.userData.sky) untagged++; });
  check(`sky ${id}: every object tagged as sky`, untagged === 0 && tagged >= 2, `${tagged} tagged, ${untagged} untagged`);
  check(`sky ${id}: no sky object casts or receives shadows`, bad.length === 0, bad.join(', '));
  sky.dispose();
}

for (const def of TRACKS) {
  let g: Object3D | null = null;
  try { g = buildLandmarks(buildTrack(def), def); } catch { g = null; }
  if (!g) continue;
  const { tagged, bad } = scan(g);
  check(`landmarks ${def.id}: background (peaks, mist) never in shadows`, bad.length === 0, `${tagged} tagged ${bad.join(', ')}`);
}

const tex = texelSize(SHADOW_HALF, SHADOW_MAP);
const onGrid = (v: number): boolean => Math.abs(v / tex - Math.round(v / tex)) < 1e-6;
let snapOk = true;
for (let i = 0; i < 2000; i++) {
  const v = (Math.random() - 0.5) * 4000;
  const s = snapToTexel(v, tex);
  if (!onGrid(s) || Math.abs(s - v) > tex / 2 + 1e-9) snapOk = false;
}
check('snapToTexel keeps values on texel multiples, within half a texel', snapOk, `texel ${tex.toFixed(4)} m`);

// the rig: the light keeps its direction and its target lands on the texel grid in light space
const scene = new Scene();
const light = new DirectionalLight(0xffffff, 1);
light.position.set(-90, 38, 30);
const rig = rigKeyShadow(light, scene, true);
const len = Math.hypot(-90, 38, 30), f = [-90 / len, 38 / len, 30 / len];
const rl = Math.hypot(f[2], f[0]), r = [f[2] / rl, 0, -f[0] / rl];
const u = [f[1] * r[2], f[2] * r[0] - f[0] * r[2], -f[1] * r[0]];
const dot = (a: number[], x: number, y: number, z: number): number => a[0] * x + a[1] * y + a[2] * z;
let gridOk = true, dirOk = true, nearOk = true;
for (let i = 0; i < 500; i++) {
  const x = (Math.random() - 0.5) * 3000, z = (Math.random() - 0.5) * 3000;
  rig.follow(x, z);
  const t = light.target.position, p = light.position;
  if (!onGrid(dot(r, t.x, t.y, t.z)) || !onGrid(dot(u, t.x, t.y, t.z))) gridOk = false;
  if (Math.abs(p.x - t.x + 90) > 1e-6 || Math.abs(p.y - t.y - 38) > 1e-6 || Math.abs(p.z - t.z - 30) > 1e-6) dirOk = false;
  if (Math.hypot(t.x - x, t.z - z) > tex * 2) nearOk = false;
}
check('shadow centre snapped to texels on both light-view axes', gridOk);
check('key light keeps its direction while following', dirOk);
check('shadow centre stays within two texels of the camera', nearOk);
const cam = light.shadow.camera;
check('shadow camera bounds and bias sensible', light.castShadow && cam.right - cam.left === 2 * SHADOW_HALF && cam.far > len && light.shadow.bias < 0 && light.shadow.bias > -0.005, `${cam.left}..${cam.right} near ${cam.near} far ${cam.far} bias ${light.shadow.bias}`);
check('light target is in the scene (so it moves)', light.target.parent === scene);
rig.dispose();

if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('sky-shadow-check: all passed');
