import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Box3, Vector3 } from 'three';
import { findBodyMaterial, normaliseCarScene, setModelYaw } from '../src/world/assetLoader.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const mesh = (w: number, h: number, d: number, x: number, y: number, z: number, name: string, mat = new MeshStandardMaterial()): Mesh => {
  const m = new Mesh(new BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.name = name;
  return m;
};

// A "Tripo-like" car: 400 units long along X, nose at +X, floating 50 units off the ground, off-centre.
const scene = new Group();
const paint = new MeshStandardMaterial({ name: 'car_paint' });
scene.add(mesh(400, 90, 170, 1000, 50 + 45, -300, 'body', paint), mesh(60, 60, 20, 1100, 80, -300, 'wheel_FL'));
const m = normaliseCarScene(scene, { targetLength: 4.4 });
const box = new Box3().setFromObject(m.root);
const size = box.getSize(new Vector3());
const c = box.getCenter(new Vector3());
check('long axis along Z', size.z > size.x, `x ${size.x.toFixed(2)} z ${size.z.toFixed(2)}`);
check('scaled to target length 4.4', Math.abs(size.z - 4.4) < 0.01, size.z.toFixed(3));
check('ground at y = 0', Math.abs(box.min.y) < 1e-6, box.min.y.toFixed(4));
check('centred on X and Z', Math.abs(c.x) < 1e-6 && Math.abs(c.z) < 1e-6, `${c.x.toFixed(3)}, ${c.z.toFixed(3)}`);
check('size reported', Math.abs(m.size.z - 4.4) < 0.01 && m.size.y > 0, JSON.stringify(m.size));
check('wheel nodes found by name', m.wheels.length === 1, `${m.wheels.length}`);
check('source scene untouched', scene.position.y === 0 && scene.children.length === 2, '');

// extra scale and yaw
const big = normaliseCarScene(scene, { targetLength: 4, scale: 1.1 });
check('scale factor applies', Math.abs(big.size.z - 4.4) < 0.02, big.size.z.toFixed(3));
setModelYaw(m, Math.PI);
const after = new Box3().setFromObject(m.root).getSize(new Vector3());
check('yaw nudge keeps size', Math.abs(after.z - 4.4) < 0.01, after.z.toFixed(3));

// body material detection
check('named body material found', findBodyMaterial(m.root)?.name === 'car_paint', '');
const single = new Group();
single.add(mesh(4, 1, 2, 0, 0, 0, 'all', new MeshStandardMaterial({ name: 'baked' })));
check('single baked material -> no tint', findBodyMaterial(single) === null, '');
const two = new Group();
two.add(mesh(4, 1, 2, 0, 0, 0, 'shell', new MeshStandardMaterial({ name: 'mat_a' })), mesh(0.5, 0.5, 0.5, 0, 1, 0, 'trim', new MeshStandardMaterial({ name: 'glass' })));
check('biggest non-glass material is the body', findBodyMaterial(two)?.name === 'mat_a', '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
