import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, Group, InstancedMesh, LineBasicMaterial, LineSegments, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import { createRng } from '../core/rng';
import { lateralPoint } from './ribbon';
import type { Track } from './track';
import { makePoolTexture } from './textures';

const NEON = [0xff2a9d, 0x18d8ff, 0xffb347, 0x7a5cff, 0x39ff88];
const LAMP_EVERY = 9; // samples
const LAMP_H = 6.5;

export interface Furniture {
  group: Group;
  /** Additive light pools under the lamps; weather raises their opacity when wet. */
  poolMat: MeshBasicMaterial;
}

/**
 * Wall lamps with light pools, neon shop signs (flat and blade), and overhead cables strung between facades.
 * `height` is the facade height per side from buildFacades (0 = no building).
 */
export function buildFurniture(tr: Track, height: [Float32Array, Float32Array], seed = 5): Furniture {
  const rnd = createRng(seed);
  const group = new Group();
  const d = new Object3D();
  const n = tr.samples.length;
  const p = { x: 0, z: 0 };
  const streetish = (i: number): boolean => tr.zones[i] === 'street' || tr.zones[i] === 'alley' || tr.zones[i] === 'plaza';

  // lamps: head on a short arm out from the wall, pool on the road below
  const lampIdx: number[] = [];
  for (let i = 4; i < n; i += LAMP_EVERY) if (tr.zones[i] !== 'tunnel') lampIdx.push(i);
  const heads = new InstancedMesh(new BoxGeometry(1.4, 0.16, 0.45), new MeshBasicMaterial({ color: new Color(0xffd9a0).multiplyScalar(3) }), lampIdx.length);
  const poolMat = new MeshBasicMaterial({ map: makePoolTexture(), color: new Color(0xffc880).multiplyScalar(1.4), transparent: true, opacity: 0.38, depthWrite: false, blending: AdditiveBlending });
  const pools = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, lampIdx.length);
  lampIdx.forEach((i, k) => {
    const side = k % 2 === 0 ? 1 : -1;
    const s = tr.samples[i];
    lateralPoint(tr, i, side * (tr.wall[i] - 1.0), p);
    d.position.set(p.x, LAMP_H, p.z);
    d.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z), 0);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    heads.setMatrixAt(k, d.matrix);
    d.position.set(s.position.x + s.tangent.z * side * 1.5, 0.045, s.position.z - s.tangent.x * side * 1.5);
    d.scale.set(s.width * 1.3, 1, 16);
    d.updateMatrix();
    pools.setMatrixAt(k, d.matrix);
  });
  group.add(heads, pools);

  // neon signs on facades: flat boards on the wall and blades sticking out over the road
  const flat: { i: number; side: number; y: number; w: number; h: number; blade: boolean }[] = [];
  for (let i = 3; i < n; i += 3) {
    if (!streetish(i)) continue;
    for (const side of [1, -1]) {
      if (height[side > 0 ? 0 : 1][i] < 6 || rnd() > 0.32) continue;
      const blade = rnd() < 0.4;
      flat.push({ i, side, y: 3.4 + rnd() * 4.5, w: blade ? 0.3 : 3.5 + rnd() * 4, h: blade ? 1.4 + rnd() * 1.2 : 0.9 + rnd() * 1.3, blade });
    }
  }
  const signs = new InstancedMesh(new BoxGeometry(1, 1, 0.2), new MeshBasicMaterial({ color: 0xffffff }), Math.max(1, flat.length));
  const col = new Color();
  flat.forEach((f, k) => {
    const s = tr.samples[f.i];
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    lateralPoint(tr, f.i, f.side * (tr.wall[f.i] - (f.blade ? 0.7 : 0.08)), p);
    d.position.set(p.x, f.y, p.z);
    d.rotation.set(0, f.blade ? yaw + Math.PI / 2 : yaw, 0);
    d.scale.set(f.w, f.h, f.blade ? 1.4 : 1);
    d.updateMatrix();
    signs.setMatrixAt(k, d.matrix);
    signs.setColorAt(k, col.setHex(NEON[Math.floor(rnd() * NEON.length)]).multiplyScalar(1.7));
  });
  signs.count = flat.length;
  group.add(signs);

  // overhead cables: two sagging wires across the street every ~27 m
  const pts: number[] = [];
  const a = { x: 0, z: 0 };
  const b = { x: 0, z: 0 };
  for (let i = 6; i < n; i += 9) {
    const top = Math.min(height[0][i], height[1][i]);
    if (!streetish(i) || top < 9) continue;
    for (let w = 0; w < 2; w++) {
      const y = Math.min(top - 1.5, 8.5 + w * 1.7 + rnd());
      lateralPoint(tr, i, tr.wall[i], a);
      lateralPoint(tr, i, -tr.wall[i], b);
      const sag = 0.9 + rnd() * 0.6;
      const seg = 8;
      for (let k = 0; k < seg; k++) {
        const t0 = k / seg;
        const t1 = (k + 1) / seg;
        const f = (t: number): number => y - sag * 4 * t * (1 - t);
        pts.push(a.x + (b.x - a.x) * t0, f(t0), a.z + (b.z - a.z) * t0, a.x + (b.x - a.x) * t1, f(t1), a.z + (b.z - a.z) * t1);
      }
    }
  }
  const cg = new BufferGeometry();
  cg.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
  group.add(new LineSegments(cg, new LineBasicMaterial({ color: 0x1a1c22 })));
  return { group, poolMat };
}
