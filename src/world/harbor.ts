import { BoxGeometry, Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry } from 'three';
import { createRng } from '../core/rng';

export const QUAY_Z0 = -128; // quay starts north of the main straight
const WATER_Z = -178;
const BOX_COLORS = [0xb3262b, 0x2459a8, 0xd8a31a, 0x2f8f5b, 0x8a8f99, 0xe0662b];

export interface Harbor {
  group: Group;
  waterMat: MeshStandardMaterial;
}

function crane(x: number, z: number, rnd: () => number): Group {
  const g = new Group();
  const steel = new MeshStandardMaterial({ color: 0xd0451b, roughness: 0.6, metalness: 0.5 });
  const dark = new MeshStandardMaterial({ color: 0x2b3038, roughness: 0.7, metalness: 0.6 });
  const add = (w: number, h: number, d: number, px: number, py: number, pz: number, m: MeshStandardMaterial): void => {
    const b = new Mesh(new BoxGeometry(w, h, d), m);
    b.position.set(px, py, pz);
    g.add(b);
  };
  for (const lx of [-9, 9]) for (const lz of [-5, 5]) add(1.2, 32, 1.2, lx, 16, lz, steel);
  add(22, 1.6, 13, 0, 32, 0, steel);
  add(3, 3, 60, 0, 36, -12, steel); // boom out over the water
  add(2, 8, 2, 0, 28, -28, dark);
  add(6, 3, 4, 0, 34.5, 10, dark);
  const light = new Mesh(new BoxGeometry(0.8, 0.8, 0.8), new MeshBasicMaterial({ color: new Color(0xff2020).multiplyScalar(4) }));
  light.position.set(0, 38.5, -40);
  g.add(light);
  g.position.set(x, 0, z);
  g.rotation.y = (rnd() - 0.5) * 0.05;
  return g;
}

/** Quay with stacked containers and gantry cranes, plus the dark water beyond. North of the main straight. */
export function buildHarbor(): Harbor {
  const rnd = createRng(21);
  const group = new Group();
  const quay = new Mesh(new PlaneGeometry(1000, 54), new MeshStandardMaterial({ color: 0x23262d, roughness: 0.85 }));
  quay.rotation.x = -Math.PI / 2;
  quay.position.set(0, 0.01, (QUAY_Z0 + WATER_Z) / 2);
  group.add(quay);

  const waterMat = new MeshStandardMaterial({ color: 0x050c1c, roughness: 0.08, metalness: 0.85 });
  const water = new Mesh(new PlaneGeometry(1600, 700), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.2, WATER_Z - 350);
  group.add(water);

  const boxes = new InstancedMesh(new BoxGeometry(6.1, 2.6, 2.4), new MeshStandardMaterial({ roughness: 0.55, metalness: 0.4 }), 260);
  const dummy = new Object3D();
  const c = new Color();
  let n = 0;
  for (let x = -330; x < 340 && n < 260; x += 8) {
    if (rnd() < 0.35) continue;
    const rows = 1 + Math.floor(rnd() * 3);
    const stack = 1 + Math.floor(rnd() * 3);
    for (let r = 0; r < rows && n < 260; r++) {
      for (let s = 0; s < stack && n < 260; s++, n++) {
        dummy.position.set(x + (rnd() - 0.5) * 0.4, 1.3 + s * 2.6, QUAY_Z0 - 8 - r * 3);
        dummy.updateMatrix();
        boxes.setMatrixAt(n, dummy.matrix);
        boxes.setColorAt(n, c.setHex(BOX_COLORS[Math.floor(rnd() * BOX_COLORS.length)]));
      }
    }
  }
  boxes.count = n;
  group.add(boxes);
  for (const x of [-200, -20, 150, 300]) group.add(crane(x, WATER_Z + 6, rnd));
  return { group, waterMat };
}
