import type { RoadGraph } from '../../types/world';
import { SIDEWALK } from '../roads/grammar';
import { heightAt } from '../roads/height';

/**
 * Ground height with the roads laid in (W5.7 fix: on the hills the 16 m ground grid bulged through the road). Inside a
 * road's corridor (tarmac + sidewalk) the ground sits DROP below the road surface; over BANK metres beyond it blends back
 * to the terrain. Uses every road segment near the point (a global 32 m bucket grid), so a vertex on a chunk border gets
 * the same height from both chunks (no cracks). Pure; the grid is built once per road graph.
 */
const DROP = 0.3, BANK = 10, CELL = 32, VERGE = 3;

interface SegGrid { cells: Map<number, number[]>; segs: Float32Array }
const grids = new WeakMap<RoadGraph, SegGrid>();
const key = (cx: number, cz: number): number => (cx + 4096) * 8192 + (cz + 4096);

/** Segments as ax, az, bx, bz, ya, yb, core half width (8 floats), bucketed by every cell their corridor touches. */
function grid(g: RoadGraph): SegGrid {
  let gr = grids.get(g);
  if (gr) return gr;
  const segs: number[] = [], cells = new Map<number, number[]>();
  for (const e of g.edges) {
    if (e.kind === 'bridge') continue; // the bridge flies over the water: no ground under it to carve
    const core = e.width / 2 + SIDEWALK + VERGE, reach = core + BANK;
    for (let k = 0; k + 1 < e.cum.length; k++) {
      const ax = e.pts[k * 2], az = e.pts[k * 2 + 1], bx = e.pts[k * 2 + 2], bz = e.pts[k * 2 + 3];
      const ya = e.ys ? e.ys[k] : heightAt(ax, az), yb = e.ys ? e.ys[k + 1] : heightAt(bx, bz);
      const id = segs.length / 8;
      segs.push(ax, az, bx, bz, ya, yb, core, 0);
      const c0 = Math.floor((Math.min(ax, bx) - reach) / CELL), c1 = Math.floor((Math.max(ax, bx) + reach) / CELL);
      const r0 = Math.floor((Math.min(az, bz) - reach) / CELL), r1 = Math.floor((Math.max(az, bz) + reach) / CELL);
      for (let cx = c0; cx <= c1; cx++) for (let cz = r0; cz <= r1; cz++) { const k2 = key(cx, cz); const l = cells.get(k2); if (l) l.push(id); else cells.set(k2, [id]); }
    }
  }
  gr = { cells, segs: Float32Array.from(segs) };
  grids.set(g, gr);
  return gr;
}

/** Terrain height at (x, z) with the road corridors laid in. */
export function groundAt(g: RoadGraph, x: number, z: number): number {
  const { cells, segs } = grid(g);
  const h = heightAt(x, z);
  const list = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return h;
  let target = h; // the lowest pull wins: where corridors overlap (junctions, slopes) no road may end up under the ground
  for (const id of list) {
    const o = id * 8, ax = segs[o], az = segs[o + 1], dx = segs[o + 2] - ax, dz = segs[o + 3] - az, core = segs[o + 6];
    const L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d >= core + BANK) continue;
    const s = d <= core ? 0 : (d - core) / BANK; // 0 inside the corridor .. 1 at the bank's outer edge
    const road = segs[o + 4] + (segs[o + 5] - segs[o + 4]) * t - DROP, k = s * s * (3 - 2 * s);
    target = Math.min(target, road + (h - road) * k);
  }
  return target;
}
