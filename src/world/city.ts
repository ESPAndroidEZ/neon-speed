import { BoxGeometry, Color, Group, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { createRng } from '../core/rng';
import type { Track } from './track';
import { makeWindowTexture } from './textures';

interface BuildingType {
  w: number;
  h: number;
  d: number;
  warm: boolean;
}
const TYPES: readonly BuildingType[] = [
  { w: 14, h: 42, d: 14, warm: true },
  { w: 22, h: 26, d: 16, warm: false },
  { w: 12, h: 70, d: 12, warm: false },
  { w: 26, h: 18, d: 24, warm: true },
];
const TINTS = [0x2a2f3d, 0x33283a, 0x23323a, 0x3a3328, 0x242838];

export interface Building {
  x: number;
  z: number;
  type: number;
}

/** Box with window-grid UVs sized in metres (one texture tile = 25.6 m), roofs mapped to a dark texel. */
function buildingGeometry(t: BuildingType): BoxGeometry {
  const g = new BoxGeometry(t.w, t.h, t.d);
  g.translate(0, t.h / 2, 0);
  const uv = g.getAttribute('uv');
  const faceW = [t.d, t.d, 0, 0, t.w, t.w];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      if (f === 2 || f === 3) uv.setXY(i, 0.01, 0.01);
      else uv.setXY(i, (uv.getX(i) * faceW[f]) / 25.6, (uv.getY(i) * t.h) / 25.6);
    }
  }
  return g;
}

/** Scatter buildings on a jittered grid, keeping clear of the track and the harbour strip. */
export function placeBuildings(tr: Track, seed = 7): Building[] {
  const rnd = createRng(seed);
  const out: Building[] = [];
  const clear = tr.barrierOffset + 10;
  for (let gx = -430; gx <= 430; gx += 36) {
    for (let gz = -110; gz <= 330; gz += 36) {
      const x = gx + (rnd() - 0.5) * 12;
      const z = gz + (rnd() - 0.5) * 12;
      if (z < -122 && Math.abs(x) < 460) continue;
      const type = Math.floor(rnd() * TYPES.length);
      const r = Math.hypot(TYPES[type].w, TYPES[type].d) / 2 + clear;
      let ok = true;
      for (const s of tr.samples) {
        const dx = s.position.x - x;
        const dz = s.position.z - z;
        if (dx * dx + dz * dz < r * r) {
          ok = false;
          break;
        }
      }
      if (ok && rnd() > 0.1) out.push({ x, z, type });
    }
  }
  return out;
}

export function buildCity(buildings: readonly Building[], seed = 11): Group {
  const rnd = createRng(seed);
  const group = new Group();
  const dummy = new Object3D();
  const tint = new Color();
  TYPES.forEach((t, ti) => {
    const list = buildings.filter((b) => b.type === ti);
    if (list.length === 0) return;
    const mat = new MeshStandardMaterial({
      color: 0xffffff, roughness: 0.75, metalness: 0.15, emissive: 0xffffff, emissiveMap: makeWindowTexture(t.warm), emissiveIntensity: 1.5,
    });
    const mesh = new InstancedMesh(buildingGeometry(t), mat, list.length);
    list.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z);
      dummy.scale.set(1, 0.8 + rnd() * 0.5, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tint.setHex(TINTS[Math.floor(rnd() * TINTS.length)]));
    });
    group.add(mesh);
  });
  return group;
}

export const buildingExtent = (b: Building): [number, number] => [TYPES[b.type].w / 2, TYPES[b.type].d / 2];
