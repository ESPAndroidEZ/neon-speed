import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { createRng } from '../core/rng';
import { lateralPoint } from './ribbon';
import type { Track } from './track';
import { makeNeonWindowTexture, makeWindowTexture } from './textures';

export interface Plaza {
  x: number;
  z: number;
  r: number;
}

export interface Facades {
  group: Group;
  /** Facade height per sample for the left (index 0) and right (index 1) side; 0 = no building there. */
  height: [Float32Array, Float32Array];
}

/** Accumulates quad strips into one BufferGeometry. */
class Strips {
  readonly pos: number[] = [];
  readonly uv: number[] = [];
  readonly col: number[] = [];
  readonly idx: number[] = [];

  /** One vertical (and optionally roofed) run of samples a..b on one side. */
  run(tr: Track, side: number, a: number, b: number, h: number, tint: readonly number[], roof: number, y0 = 0, inset = 0): void {
    const n = tr.samples.length;
    const p = { x: 0, z: 0 };
    const per = roof > 0 ? 3 : 2;
    const base = this.pos.length / 3;
    for (let i = a; i <= b; i++) {
      const k = i % n;
      const o = side * (tr.wall[k] + 0.02 - inset);
      lateralPoint(tr, k, o, p);
      this.pos.push(p.x, y0, p.z, p.x, h, p.z);
      const u = (i * tr.spacing) / 16;
      this.uv.push(u, 0, u, (h - y0) / 16);
      this.col.push(tint[0], tint[1], tint[2], tint[0], tint[1], tint[2]);
      if (roof > 0) {
        lateralPoint(tr, k, o + side * roof, p);
        this.pos.push(p.x, h, p.z);
        this.uv.push(0.01, 0.01);
        this.col.push(0.2, 0.2, 0.22);
      }
    }
    for (let i = 0; i < b - a; i++) {
      const v = base + i * per;
      const w = v + per;
      this.idx.push(v, v + 1, w, v + 1, w + 1, w);
      if (roof > 0) this.idx.push(v + 1, v + 2, w + 1, v + 2, w + 2, w + 1);
    }
  }

  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(this.uv), 2));
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

const TINTS: readonly (readonly number[])[] = [[0.55, 0.45, 0.42], [0.42, 0.45, 0.55], [0.5, 0.5, 0.5], [0.58, 0.5, 0.38], [0.45, 0.38, 0.5], [0.4, 0.5, 0.48]];
const SHOP: readonly (readonly number[])[] = [[0.7, 0.32, 0.12], [0.12, 0.5, 0.62], [0.7, 0.1, 0.35], [0.1, 0.55, 0.25], [0.6, 0.5, 0.32], [0.04, 0.04, 0.06], [0.04, 0.04, 0.06], [0.04, 0.04, 0.06]];

/**
 * Continuous building facades flush with the street walls, in runs of random height and tint,
 * with lit ground-floor shopfronts. Street, alley and plaza zones only; the plaza's inner side is a low fountain rim.
 */
export function buildFacades(tr: Track, plaza?: Plaza): Facades {
  const rnd = createRng(31);
  const n = tr.samples.length;
  const height: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  const warm = new Strips();
  const cool = new Strips();
  const neon = new Strips();
  const shops = new Strips();
  const rim = new Strips();
  const inPlaza = (i: number): boolean => {
    if (!plaza) return false;
    const s = tr.samples[i].position;
    return Math.hypot(s.x - plaza.x, s.z - plaza.z) < plaza.r + 3;
  };
  const eligible = (i: number): boolean => {
    const z = tr.zones[i];
    return z === 'street' || z === 'alley' || z === 'plaza' || z === 'boulevard';
  };
  for (const side of [1, -1]) {
    const hi = side > 0 ? 0 : 1;
    let i = 0;
    while (i < n) {
      if (!eligible(i)) {
        i++;
        continue;
      }
      // the inner side of the plaza U (left turn, centre on the left) is the fountain rim
      const basin = inPlaza(i) && side > 0;
      let len = basin ? 6 : 4 + Math.floor(rnd() * 4);
      let j = i;
      while (j < n && j - i < len && eligible(j) && inPlaza(j) === inPlaza(i)) j++;
      len = j - i;
      if (len < 2) {
        i = Math.min(n, i + 1);
        continue;
      }
      const alley = tr.zones[i] === 'alley';
      const h = basin ? 1.1 : (alley ? 24 : 12) + rnd() * (alley ? 26 : 38);
      const b = Math.min(n, j);
      if (basin) rim.run(tr, side, i, b, h, [0.15, 1.2, 1.8], 0, 0, 0.05);
      else {
        (rnd() < 0.18 ? neon : rnd() < 0.5 ? warm : cool).run(tr, side, i, b, h, TINTS[Math.floor(rnd() * TINTS.length)], 2);
        const c = SHOP[Math.floor(rnd() * SHOP.length)];
        if (b - i > 3 && rnd() < 0.8) shops.run(tr, side, i + 1, b - 1, 3.0, c, 0, 0.35, 0.07);
      }
      for (let k = i; k <= b; k++) height[hi][k % n] = h;
      i = b;
    }
  }
  const group = new Group();
  const addWalls = (s: Strips, isWarm: boolean, texture?: ReturnType<typeof makeWindowTexture>): void => {
    if (s.idx.length === 0) return;
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1, side: DoubleSide, emissive: 0xffffff, emissiveMap: texture ?? makeWindowTexture(isWarm), emissiveIntensity: 1.5 });
    group.add(new Mesh(s.geometry(), m));
  };
  addWalls(warm, true);
  addWalls(cool, false);
  addWalls(neon, false, makeNeonWindowTexture());
  const basic = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
  if (shops.idx.length > 0) group.add(new Mesh(shops.geometry(), basic));
  if (rim.idx.length > 0) group.add(new Mesh(rim.geometry(), basic));
  return { group, height };
}
