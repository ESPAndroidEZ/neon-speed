import type { ChunkInfo, ChunkKey, Footprint, RoadGraph } from '../../types/world';
import { districtAt } from '../roads/grammar';

/** Streaming cell size (m): the 6144 m world is 48 x 48 chunks. */
export const CHUNK = 128;

export const chunkCount = (g: RoadGraph): number => Math.ceil((g.half * 2) / CHUNK);
/** Cell column / row of a world coordinate (clamped to the map). */
export const cellOf = (g: RoadGraph, v: number): number => Math.min(chunkCount(g) - 1, Math.max(0, Math.floor((v + g.half) / CHUNK)));
export const chunkKey = (cx: number, cz: number): ChunkKey => `${cx},${cz}`;

/**
 * What each chunk holds: the road edges that touch it (any segment's padded box) and the buildings whose centre is in
 * it. Index = cz * n + cx. Pure; built once when free roam starts.
 */
export function chunkIndex(g: RoadGraph, fs: readonly Footprint[]): ChunkInfo[] {
  const n = chunkCount(g);
  const out: ChunkInfo[] = [];
  for (let cz = 0; cz < n; cz++) {
    for (let cx = 0; cx < n; cx++) {
      out.push({ cx, cz, district: districtAt(-g.half + (cx + 0.5) * CHUNK, -g.half + (cz + 0.5) * CHUNK), edges: [], buildings: [] });
    }
  }
  for (const e of g.edges) {
    const seen = new Set<number>();
    const pad = e.width / 2 + 4;
    for (let k = 0; k + 1 < e.cum.length; k++) {
      const ax = e.pts[k * 2], az = e.pts[k * 2 + 1], bx = e.pts[k * 2 + 2], bz = e.pts[k * 2 + 3];
      const x0 = cellOf(g, Math.min(ax, bx) - pad), x1 = cellOf(g, Math.max(ax, bx) + pad);
      const z0 = cellOf(g, Math.min(az, bz) - pad), z1 = cellOf(g, Math.max(az, bz) + pad);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) seen.add(z * n + x);
    }
    for (const i of seen) out[i].edges.push(e.id);
  }
  fs.forEach((f, i) => out[cellOf(g, f.z) * n + cellOf(g, f.x)].buildings.push(i));
  return out;
}
