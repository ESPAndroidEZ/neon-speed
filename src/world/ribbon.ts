import { BufferAttribute, BufferGeometry } from 'three';
import type { Track } from './track';

/** A lateral offset from the centre line: constant, or per sample (left of travel = positive). */
export type Off = number | ((i: number) => number);
const val = (o: Off, i: number): number => (typeof o === 'number' ? o : o(i));
const wrap = (tr: Track, i: number): number => i % tr.samples.length;
/** Road height at sample i (flat tracks: 0). */
const hgt = (tr: Track, i: number): number => tr.heights[wrap(tr, i)];

/** Ground position at lateral offset `off` from sample i. */
export function lateralPoint(tr: Track, i: number, off: number, out: { x: number; z: number }): void {
  const s = tr.samples[wrap(tr, i)];
  out.x = s.position.x + s.tangent.z * off;
  out.z = s.position.z - s.tangent.x * off;
}

function finish(pos: number[], uv: number[], idx: number[], col?: number[]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  if (col) g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Predicate over sample index: only quads whose two end samples both pass are emitted. */
export type Keep = (i: number) => boolean;

/** Flat strip between two lateral offsets at height y. V runs along the lap in `vScale` metre tiles. */
export function ribbon(tr: Track, offA: Off, offB: Off, y: number, vScale = 16, keep: Keep = () => true): BufferGeometry {
  const n = tr.samples.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const p = { x: 0, z: 0 };
  for (let i = 0; i <= n; i++) {
    lateralPoint(tr, i, val(offA, wrap(tr, i)), p);
    pos.push(p.x, y + hgt(tr, i), p.z);
    lateralPoint(tr, i, val(offB, wrap(tr, i)), p);
    pos.push(p.x, y + hgt(tr, i), p.z);
    uv.push(0, (i * tr.spacing) / vScale, 1, (i * tr.spacing) / vScale);
    if (i < n && keep(i) && keep(wrap(tr, i + 1))) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  return finish(pos, uv, idx);
}

/** Vertical wall at lateral offset `off`, from y0 to y1 (y1 may vary per sample). UV in metres / tile. */
export function wallStrip(tr: Track, off: Off, y0: number, y1: number | ((i: number) => number), tile = 16, keep: Keep = () => true): BufferGeometry {
  const n = tr.samples.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const p = { x: 0, z: 0 };
  for (let i = 0; i <= n; i++) {
    const top = typeof y1 === 'number' ? y1 : y1(wrap(tr, i));
    lateralPoint(tr, i, val(off, wrap(tr, i)), p);
    const h = hgt(tr, i);
    pos.push(p.x, y0 + h, p.z, p.x, top + h, p.z);
    uv.push((i * tr.spacing) / tile, 0, (i * tr.spacing) / tile, (top - y0) / tile);
    if (i < n && keep(i) && keep(wrap(tr, i + 1))) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  return finish(pos, uv, idx);
}
