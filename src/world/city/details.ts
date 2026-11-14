import { BoxGeometry, Color, CylinderGeometry, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, SphereGeometry, type BufferGeometry, type Material } from 'three';
import { createRng } from '../../core/rng';
import type { Palette } from '../../data/palettes';
import type { Track } from '../track';

/** One placed part: world position, yaw (local +Z = pointing out of the wall), scale, tint. */
export interface Placement {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sx: number;
  sy: number;
  sz: number;
  color: number;
}

export type DetailKind = 'ac' | 'balcony' | 'awning' | 'escape' | 'tank' | 'antenna' | 'billboard' | 'beacon';
export type DetailLayout = Record<DetailKind, Placement[]>;

/** Hard caps per kind: the instance budget of the facade kit (see docs/art-direction.md, budgets). */
export const DETAIL_CAPS: Record<DetailKind, number> = { ac: 700, balcony: 450, awning: 260, escape: 200, tank: 90, antenna: 130, billboard: 36, beacon: 140 };

const GREY = [0x7a7f88, 0x6a707a, 0x8b8f96, 0x5d636d];

/**
 * Pure placement of facade and rooftop details along both sides of the street, deterministic per seed. `height[0|1]` is the facade
 * height per sample for the left and right side (0 = no building), as built by `buildFacades`. No three objects: unit-testable.
 */
export function layoutDetails(tr: Track, height: readonly [Float32Array, Float32Array], pal: Palette, seed = 41): DetailLayout {
  const rnd = createRng(seed);
  const out: DetailLayout = { ac: [], balcony: [], awning: [], escape: [], tank: [], antenna: [], billboard: [], beacon: [] };
  const n = tr.samples.length;
  const put = (k: DetailKind, p: Placement): void => void (out[k].length < DETAIL_CAPS[k] && out[k].push(p));
  for (const side of [1, -1]) {
    const hs = height[side > 0 ? 0 : 1];
    for (let i = 2; i < n - 2; i++) {
      const h = hs[i];
      if (h < 8 || tr.zones[i] === 'tunnel') continue;
      const s = tr.samples[i];
      const ox = s.tangent.z * side;
      const oz = -s.tangent.x * side;
      const yaw = Math.atan2(ox, oz);
      const base = tr.wall[i] + 0.02;
      const at = (off: number, y: number): [number, number, number] => [s.position.x + s.tangent.z * side * off, s.position.y + y, s.position.z - s.tangent.x * side * off];
      const floors = Math.floor((h - 4) / 3.2);
      if (i % 2 === 0) for (let f = 1; f < floors; f++) {
        const y = 3.4 + f * 3.2;
        const r = rnd();
        if (r < 0.09) { const [x, yy, z] = at(base + 0.3, y + 0.5); put('ac', { x, y: yy, z, yaw, sx: 0.8, sy: 0.55, sz: 0.6, color: GREY[Math.floor(rnd() * 4)] }); }
        else if (r < 0.14 && tr.zones[i] !== 'alley') { const [x, yy, z] = at(base + 0.6, y); put('balcony', { x, y: yy, z, yaw, sx: 2.2, sy: 1, sz: 1.2, color: GREY[Math.floor(rnd() * 4)] }); }
        else if (r < 0.17 && tr.zones[i] === 'alley') { const [x, yy, z] = at(base + 0.5, y); put('escape', { x, y: yy, z, yaw, sx: 2, sy: 1, sz: 1, color: 0x2a2d33 }); }
      }
      // shopfront awnings over the ground floor, coloured from the district accents
      if (i % 3 === 1 && rnd() < 0.42) { const [x, y, z] = at(base + 0.8, 3.3); put('awning', { x, y, z, yaw, sx: 3.2, sy: 0.3, sz: 0.9, color: rnd() < 0.5 ? pal.accent[0] : pal.accent[1] }); }
      // rooftops: tanks, antennas, billboards and red aircraft lights on the tallest runs
      if (i % 4 === 0) {
        const r = rnd();
        const [x, y, z] = at(base + 3, h);
        if (r < 0.18) put('tank', { x, y: y + 1.6, z, yaw, sx: 1, sy: 1, sz: 1, color: 0x5a4a3a });
        else if (r < 0.4) put('antenna', { x, y: y + 3, z, yaw, sx: 1, sy: 1 + rnd() * 1.2, sz: 1, color: 0x30343c });
        else if (r < 0.46 && h > 20) { const [bx, by, bz] = at(base + 0.4, h + 1.8); put('billboard', { x: bx, y: by, z: bz, yaw, sx: 7 + rnd() * 3, sy: 3, sz: 1, color: rnd() < 0.5 ? pal.accent[0] : pal.key }); }
        if (h > 40 && r > 0.8) { const [bx, by, bz] = at(base + 2, h + 0.4); put('beacon', { x: bx, y: by, z: bz, yaw, sx: 1, sy: 1, sz: 1, color: 0xff2020 }); }
      }
    }
  }
  return out;
}

export interface Details {
  group: Group;
  /** Blink the aircraft beacons and flicker the signs. */
  update(t: number): void;
  dispose(): void;
}

/** Instanced meshes for a `DetailLayout`: one draw call per kind. */
export function buildDetails(layout: DetailLayout): Details {
  const group = new Group();
  const owned: { g: BufferGeometry; m: Material }[] = [];
  const d = new Object3D();
  const c = new Color();
  const make = (kind: DetailKind, geo: BufferGeometry, mat: Material, lift = 0): InstancedMesh => {
    const list = layout[kind];
    const m = new InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((p, i) => {
      d.position.set(p.x, p.y + lift * p.sy, p.z);
      d.rotation.set(0, p.yaw, 0);
      d.scale.set(p.sx, p.sy, p.sz);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, c.setHex(p.color));
    });
    m.count = list.length;
    m.frustumCulled = true;
    owned.push({ g: geo, m: mat });
    group.add(m);
    return m;
  };
  const metal = new MeshStandardMaterial({ roughness: 0.6, metalness: 0.5 });
  make('ac', new BoxGeometry(1, 1, 1), metal);
  make('balcony', new BoxGeometry(1, 0.12, 1), metal, 0);
  make('escape', new BoxGeometry(1, 0.08, 1), metal);
  make('tank', new CylinderGeometry(1.1, 1.1, 2.4, 10), new MeshStandardMaterial({ roughness: 0.9 }));
  make('antenna', new BoxGeometry(0.12, 6, 0.12), metal);
  // awnings and billboards glow: bright accent colours on basic materials (HDR so bloom picks them up)
  const glow = new MeshBasicMaterial({ color: new Color(0.85, 0.85, 0.85) });
  make('awning', new BoxGeometry(1, 0.18, 1), glow);
  make('billboard', new BoxGeometry(1, 1, 0.2), glow);
  const beaconMat = new MeshBasicMaterial({ color: new Color(0xff2020).multiplyScalar(5) });
  make('beacon', new SphereGeometry(0.3, 6, 5), beaconMat);
  return {
    group,
    update: (t) => {
      const on = Math.sin(t * 2.4) > 0.55 ? 5 : 0.4; // slow aircraft-light blink
      beaconMat.color.setHex(0xff2020).multiplyScalar(on);
      glow.color.setScalar(0.8 + Math.sin(t * 31) * 0.04 + (Math.sin(t * 2.1) > 0.97 ? -0.7 : 0)); // the odd flicker
    },
    dispose: () => {
      for (const o of owned) { o.g.dispose(); o.m.dispose(); }
    },
  };
}
