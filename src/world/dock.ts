import { BoxGeometry, Color, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three';
import { createRng } from '../core/rng';
import { ribbon, wallStrip } from './ribbon';
import type { Track } from './track';
import { zoneRun } from './tunnelBridge';

const BOX_COLORS = [0xb3262b, 0x2459a8, 0xd8a31a, 0x2f8f5b, 0x8a8f99, 0xe0662b];

function crane(): Group {
  const g = new Group();
  const steel = new MeshStandardMaterial({ color: 0xd0451b, roughness: 0.6, metalness: 0.5 });
  const dark = new MeshStandardMaterial({ color: 0x2b3038, roughness: 0.7, metalness: 0.6 });
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, m: MeshStandardMaterial): void => {
    const b = new Mesh(new BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
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
  return g;
}

/**
 * Dock strip: water and a chain rail on the left, container stacks flush with the right wall, gantry cranes
 * over the water, mooring bollards. (Left of travel is the water side: the dock leg runs along the harbour edge.)
 */
export interface Dock {
  group: Group;
  waterMat: MeshStandardMaterial;
  /** Procedural container stacks and where each box sits (a container GLB replaces them). */
  boxes: InstancedMesh | null;
  containers: { x: number; y: number; z: number; yaw: number }[];
}

export function buildDock(tr: Track): Dock {
  const group = new Group();
  const waterMat = new MeshStandardMaterial({ color: 0x050c1c, roughness: 0.08, metalness: 0.85 });
  const run = zoneRun(tr, 'dock');
  if (!run) return { group, waterMat, boxes: null, containers: [] };
  const containers: Dock['containers'] = [];
  const rnd = createRng(21);
  const keep = (i: number): boolean => i >= run[0] && i <= run[1];
  group.add(new Mesh(ribbon(tr, (i) => tr.wall[i] + 0.4, 90, -0.012, 20, (i) => i >= run[0] - 6 && i <= run[1] + 6), waterMat));
  const chain = new MeshStandardMaterial({ color: 0x20232a, roughness: 0.6, metalness: 0.6, side: DoubleSide });
  group.add(new Mesh(wallStrip(tr, (i) => tr.wall[i], 0, 0.5, 6, keep), chain), new Mesh(wallStrip(tr, (i) => tr.wall[i], 0.85, 0.95, 6, keep), chain));

  const d = new Object3D();
  const c = new Color();
  const boxes = new InstancedMesh(new BoxGeometry(2.4, 2.6, 6.1), new MeshStandardMaterial({ roughness: 0.55, metalness: 0.4 }), 700);
  let n = 0;
  for (let i = run[0]; i <= run[1] && n < 690; i += 2) {
    if (rnd() < 0.12) continue;
    const s = tr.samples[i];
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    for (let row = 0; row < 2; row++) {
      const levels = 1 + Math.floor(rnd() * 3);
      for (let l = 0; l < levels && n < 700; l++, n++) {
        const off = -(tr.wall[i] + 1.3 + row * 2.6);
        d.position.set(s.position.x + s.tangent.z * off, 1.3 + l * 2.6, s.position.z - s.tangent.x * off);
        d.rotation.y = yaw;
        d.updateMatrix();
        boxes.setMatrixAt(n, d.matrix);
        containers.push({ x: d.position.x, y: d.position.y - 1.3, z: d.position.z, yaw });
        boxes.setColorAt(n, c.setHex(BOX_COLORS[Math.floor(rnd() * BOX_COLORS.length)]));
      }
    }
  }
  boxes.count = n;
  group.add(boxes);

  const bollards = new InstancedMesh(new CylinderGeometry(0.22, 0.28, 0.7, 8), chain, 40);
  let b = 0;
  for (let i = run[0] + 3; i <= run[1] && b < 40; i += 9, b++) {
    const s = tr.samples[i];
    d.position.set(s.position.x + s.tangent.z * (tr.wall[i] + 0.25), 0.35, s.position.z - s.tangent.x * (tr.wall[i] + 0.25));
    d.rotation.set(0, 0, 0);
    d.updateMatrix();
    bollards.setMatrixAt(b, d.matrix);
  }
  bollards.count = b;
  group.add(bollards);

  for (const f of [0.15, 0.5, 0.85]) {
    const i = Math.round(run[0] + (run[1] - run[0]) * f);
    const s = tr.samples[i];
    const cr = crane();
    cr.position.set(s.position.x + s.tangent.z * (tr.wall[i] + 14), 0, s.position.z - s.tangent.x * (tr.wall[i] + 14));
    // boom points out over the water (the left-hand side, +lateral)
    cr.rotation.y = Math.atan2(s.tangent.z, -s.tangent.x) + Math.PI;
    group.add(cr);
  }
  return { group, waterMat, boxes, containers };
}
