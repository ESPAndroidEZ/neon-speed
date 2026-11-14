import { BoxGeometry, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three';
import { createRng } from '../core/rng';
import { lateralPoint, ribbon, wallStrip } from './ribbon';
import type { Track } from './track';

export const SEA_LEVEL = -6;

/** A strip of terrain along the road: each row is a lateral offset and a height rule (road height `h` in, world height out). */
function terrain(tr: Track, side: number, rows: readonly { off: number; y: (h: number, i: number) => number }[], mat: MeshStandardMaterial): Mesh {
  const n = tr.samples.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const p = { x: 0, z: 0 };
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    for (const r of rows) {
      lateralPoint(tr, k, side * (tr.wall[k] + r.off), p);
      pos.push(p.x, r.y(tr.heights[k], k), p.z);
    }
    if (i < n) {
      const b = i * rows.length;
      for (let r = 0; r < rows.length - 1; r++) idx.push(b + r, b + r + 1, b + r + rows.length, b + r + 1, b + r + rows.length + 1, b + r + rows.length);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new Mesh(g, mat);
}

/**
 * The north coast around the road: ocean on the left (outside of the bends) below a steep cliff face, rock rising on
 * the right, guard rails on both sides and amber reflector posts so the edge reads at night.
 */
export function buildCliffside(tr: Track): Group {
  const g = new Group();
  const rock = new MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.95, flatShading: true, side: DoubleSide });
  const rnd = createRng(33);
  const jag = Array.from({ length: tr.samples.length }, () => rnd());
  g.add(
    terrain(tr, 1, [{ off: 0.3, y: (h) => h - 0.3 }, { off: 4, y: (h) => h - 7 }, { off: 12, y: (h, i) => Math.max(SEA_LEVEL - 1, h - 22 - jag[i] * 6) }, { off: 40, y: () => SEA_LEVEL - 1.5 }], rock),
    terrain(tr, -1, [{ off: 0.3, y: (h) => h - 0.3 }, { off: 3, y: (h, i) => h + 3 + jag[i] * 2 }, { off: 12, y: (h, i) => h + 14 + jag[i] * 8 }, { off: 50, y: (h, i) => h + 48 + jag[i] * 14 }], rock),
  );
  const rail = new MeshStandardMaterial({ color: 0xaab0bb, roughness: 0.4, metalness: 0.8, side: DoubleSide });
  const concrete = new MeshStandardMaterial({ color: 0x555a63, roughness: 0.9, side: DoubleSide });
  const left = (i: number): number => tr.wall[i] - 0.12;
  g.add(
    new Mesh(wallStrip(tr, left, 0.55, 0.85, 8), rail),
    new Mesh(wallStrip(tr, left, 0.0, 0.4, 8), concrete),
    new Mesh(wallStrip(tr, (i) => -(tr.wall[i] - 0.12), 0, 0.9, 8), concrete),
  );
  // lane markings that glow a little so the road reads without street lamps: edge lines and centre dashes
  const paint = new MeshBasicMaterial({ color: new Color(0xe8e8f0).multiplyScalar(0.55), side: DoubleSide });
  const hw = (i: number): number => tr.samples[i].width / 2;
  g.add(
    new Mesh(ribbon(tr, (i) => hw(i) - 0.55, (i) => hw(i) - 0.3, 0.05), paint),
    new Mesh(ribbon(tr, (i) => -hw(i) + 0.3, (i) => -hw(i) + 0.55, 0.05), paint),
    new Mesh(ribbon(tr, -0.1, 0.1, 0.05, 16, (i) => i % 6 < 3), new MeshBasicMaterial({ color: new Color(0xffc040).multiplyScalar(0.6), side: DoubleSide })),
  );
  // posts and glowing reflectors every 12 m on the sea side
  const n = tr.samples.length;
  const step = Math.max(1, Math.round(12 / tr.spacing));
  const total = Math.ceil(n / step);
  const posts = new InstancedMesh(new BoxGeometry(0.14, 1.0, 0.14), rail, total);
  const reflect = new InstancedMesh(new BoxGeometry(0.22, 0.12, 0.05), new MeshBasicMaterial({ color: new Color(0xffa030).multiplyScalar(3) }), total);
  const d = new Object3D();
  const p = { x: 0, z: 0 };
  for (let k = 0; k < total; k++) {
    const i = (k * step) % n;
    const s = tr.samples[i];
    lateralPoint(tr, i, tr.wall[i] - 0.2, p);
    d.position.set(p.x, tr.heights[i] + 0.5, p.z);
    d.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
    d.updateMatrix();
    posts.setMatrixAt(k, d.matrix);
    lateralPoint(tr, i, tr.wall[i] - 0.3, p);
    d.position.set(p.x, tr.heights[i] + 0.72, p.z);
    d.updateMatrix();
    reflect.setMatrixAt(k, d.matrix);
  }
  g.add(posts, reflect);
  return g;
}
