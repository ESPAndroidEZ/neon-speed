import { BufferAttribute, BufferGeometry } from 'three';

/** Half cross-section (x >= 0) as (x, y) points from one end to the other; the loft mirrors it across x = 0. */
export type HalfRing = readonly (readonly [number, number])[];

export interface LoftOptions {
  /** Closed rings wrap round (bottom included); open rings are a strip (no bottom). */
  closed: boolean;
  /** Metres per UV unit, so a bump or flake texture tiles evenly. */
  uvScale?: number;
  /** For open rings: material group per half-ring segment (applied to both halves), e.g. [0, 1] = side glass, roof. */
  segmentGroups?: readonly number[];
}

/**
 * Lofted surface through cross-sections along Z (stations), mirrored across the centre plane. Smooth shared normals,
 * flat caps at both ends for closed rings. Returns the geometry; with `segmentGroups` it also carries material groups.
 */
export function loft(zs: readonly number[], ringAt: (z: number, i: number) => HalfRing, o: LoftOptions): BufferGeometry {
  const rings: [number, number][][] = zs.map((z, i) => {
    const h = ringAt(z, i);
    const left = h.map((p) => [-p[0], p[1]] as [number, number]);
    const right = h.map((p) => [p[0], p[1]] as [number, number]).reverse();
    // closed: bottom-centre ... top-centre on the left, top-centre ... bottom-centre on the right, dropping the duplicated centre points
    return o.closed ? [...left, ...right.slice(1, -1)] : [...left, ...right];
  });
  const P = rings[0].length;
  const pos: number[] = [];
  const uv: number[] = [];
  const k = o.uvScale ?? 0.25;
  zs.forEach((z, i) => rings[i].forEach(([x, y]) => (pos.push(x, y, z), uv.push(x / k, z / k))));
  const idx: number[] = [];
  const groups: { start: number; count: number; mat: number }[] = [];
  const segs = o.closed ? P : P - 1;
  const order: number[] = Array.from({ length: segs }, (_, s) => s);
  if (o.segmentGroups) order.sort((a, b) => group(a) - group(b));
  function group(s: number): number {
    const g = o.segmentGroups;
    if (!g) return 0;
    const n = g.length;
    const m = s < Math.floor(P / 2) ? s : P - 2 - s; // mirrored index for the right half
    return g[Math.min(n - 1, Math.max(0, m))] ?? 0;
  }
  let curGroup = -1;
  let start = 0;
  for (const s of order) {
    const g = group(s);
    if (g !== curGroup) {
      if (curGroup >= 0) groups.push({ start, count: idx.length - start, mat: curGroup });
      curGroup = g;
      start = idx.length;
    }
    const s2 = (s + 1) % P;
    for (let i = 0; i < zs.length - 1; i++) {
      const a = i * P + s;
      const b = i * P + s2;
      const c = (i + 1) * P + s;
      const d = (i + 1) * P + s2;
      idx.push(a, c, b, b, c, d);
    }
  }
  if (curGroup >= 0) groups.push({ start, count: idx.length - start, mat: curGroup });
  if (o.closed) { // end caps: fans to the ring centre
    for (const [ring, i, flip] of [[rings[0], 0, true], [rings[zs.length - 1], zs.length - 1, false]] as const) {
      let cx = 0;
      let cy = 0;
      ring.forEach(([x, y]) => ((cx += x), (cy += y)));
      const c = pos.length / 3;
      pos.push(cx / P, cy / P, zs[i]);
      uv.push(cx / P / k, zs[i] / k);
      for (let s = 0; s < P; s++) {
        const a = i * P + s;
        const b = i * P + ((s + 1) % P);
        idx.push(...(flip ? [c, a, b] : [c, b, a]));
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  if (o.segmentGroups) groups.forEach((x) => g.addGroup(x.start, x.count, x.mat));
  g.computeVertexNormals();
  return g;
}
