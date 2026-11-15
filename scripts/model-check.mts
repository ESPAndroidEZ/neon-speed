// Validates a car GLB against the game's conventions and the car's data. No dependencies (reads the GLB directly).
// Usage: npx tsx scripts/model-check.mts public/models/civic.glb civic   (prints PASS/FAIL lines, exit 1 on any FAIL)
import { readFileSync } from 'node:fs';
import { CARS } from '../src/data/cars';

type Node = { name?: string; mesh?: number; translation?: number[]; scale?: number[]; children?: number[] };
const [file, carId] = process.argv.slice(2);
if (!file || !carId) { console.log('usage: model-check.mts <file.glb> <carId>'); process.exit(2); }
const car = CARS.find((c) => c.id === carId);
if (!car) { console.log(`FAIL unknown car id ${carId}`); process.exit(1); }

const buf = readFileSync(file);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const nodes: Node[] = gltf.nodes ?? [];
const top: number[] = gltf.scenes[gltf.scene ?? 0].nodes;
let failed = false;
const check = (ok: boolean, msg: string): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failed = true; };

// world-space bounds per top-level node (translation + scale; rb.finish applies rotations)
const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
let tris = 0;
const wheels = new Map<string, number[]>();
for (const i of top) {
  const n = nodes[i];
  const t = n.translation ?? [0, 0, 0], s = n.scale ?? [1, 1, 1];
  if (/^wheel_(fl|fr|rl|rr)$/.test(n.name ?? '')) wheels.set(n.name!.slice(6), t);
  if (n.mesh === undefined) continue;
  for (const p of gltf.meshes[n.mesh].primitives) {
    const pos = gltf.accessors[p.attributes.POSITION];
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], t[k] + pos.min[k] * s[k]);
      hi[k] = Math.max(hi[k], t[k] + pos.max[k] * s[k]);
    }
    tris += (p.indices !== undefined ? gltf.accessors[p.indices].count : pos.count) / 3;
  }
}
const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
const sh = car.shape;
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= b * tol;
const f = (x: number): string => x.toFixed(2);

check(top.every((i) => !nodes[i].children?.length), 'flat hierarchy (no nested nodes)');
check(tris <= 30000, `triangles ${tris} <= 30000`);
check(near(size[2], sh.length, 0.05), `length ${f(size[2])} m ~ ${sh.length} (5%)`);
check(near(size[0], sh.width, 0.08), `width ${f(size[0])} m ~ ${sh.width} (8%, mirrors allowed)`);
check(near(size[1], sh.height, 0.08), `height ${f(size[1])} m ~ ${sh.height} (8%, wing allowed)`);
check(Math.abs(lo[1]) < 0.02, `stands on y = 0 (lowest ${f(lo[1])})`);
check(Math.abs(lo[0] + hi[0]) < 0.05 && Math.abs(lo[2] + hi[2]) < 0.1, 'centred on x and z');
const mats: string[] = (gltf.materials ?? []).map((m: { name?: string }) => m.name ?? '');
check(mats.includes('paint'), `material "paint" present (have: ${mats.join(', ')})`);
check(wheels.size === 4, `4 top-level wheel nodes wheel_fl/fr/rl/rr (found ${[...wheels.keys()].join(',') || 'none'})`);
if (wheels.size === 4) {
  const [fl, fr, rl, rr] = ['fl', 'fr', 'rl', 'rr'].map((k) => wheels.get(k)!);
  check(fl[2] > rl[2] && fr[2] > rr[2], 'front wheels toward +Z (nose)');
  check(fl[0] > 0 && rl[0] > 0 && fr[0] < 0 && rr[0] < 0, 'left wheels on +X');
  check(near(fl[2] - rl[2], sh.wheelbase, 0.04), `wheelbase ${f(fl[2] - rl[2])} ~ ${sh.wheelbase} (4%)`);
  check(near(fl[1], sh.wheelRadius, 0.1), `hub height ${f(fl[1])} ~ wheel radius ${sh.wheelRadius}`);
}
console.log(failed ? 'MODEL CHECK FAILED' : 'MODEL CHECK OK');
process.exit(failed ? 1 : 0);
