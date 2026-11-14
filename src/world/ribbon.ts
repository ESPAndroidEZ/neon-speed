import { BufferAttribute, BufferGeometry } from 'three';
import type { Track } from './track';

/** Position on the ground at lateral offset `off` from sample i (left of travel = positive). */
const px = (tr: Track, i: number, off: number): number => tr.samples[i % tr.samples.length].position.x + tr.samples[i % tr.samples.length].tangent.z * off;
const pz = (tr: Track, i: number, off: number): number => tr.samples[i % tr.samples.length].position.z - tr.samples[i % tr.samples.length].tangent.x * off;

function finish(pos: number[], uv: number[], idx: number[], col?: number[]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  if (col) g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Flat strip between two lateral offsets at height y. V runs along the lap in `vScale` metre tiles. */
export function ribbon(tr: Track, offA: number, offB: number, y: number, vScale = 16): BufferGeometry {
  const n = tr.samples.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    pos.push(px(tr, i, offA), y, pz(tr, i, offA), px(tr, i, offB), y, pz(tr, i, offB));
    uv.push(0, (i * tr.spacing) / vScale, 1, (i * tr.spacing) / vScale);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  return finish(pos, uv, idx);
}

/**
 * Striped kerb or wall block: a ribbon with alternating vertex colours every `stripe` samples.
 * Wall: vertical inside face plus top. `height` 0 gives a flat kerb.
 */
export function stripedBand(tr: Track, offA: number, offB: number, y: number, height: number, ca: readonly number[], cb: readonly number[], stripe = 2): BufferGeometry {
  const n = tr.samples.length;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const rings = height > 0 ? 3 : 2; // inner-bottom, inner-top, outer-top (or inner/outer flat)
  for (let i = 0; i <= n; i++) {
    const c = Math.floor(i / stripe) % 2 === 0 ? ca : cb;
    if (height > 0) pos.push(px(tr, i, offA), y, pz(tr, i, offA), px(tr, i, offA), y + height, pz(tr, i, offA), px(tr, i, offB), y + height, pz(tr, i, offB));
    else pos.push(px(tr, i, offA), y, pz(tr, i, offA), px(tr, i, offB), y, pz(tr, i, offB));
    for (let k = 0; k < rings; k++) col.push(c[0], c[1], c[2]);
    if (i < n) {
      for (let k = 0; k < rings - 1; k++) {
        const a = i * rings + k;
        const b = a + rings;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const uv = new Array<number>((pos.length / 3) * 2).fill(0);
  const g = finish(pos, uv, idx, col);
  return g;
}

export { px as lateralX, pz as lateralZ };
