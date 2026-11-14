import type { DistrictId, RoadKind } from '../../types/world';

/** Road widths (m), lane counts and traffic speed limits (m/s) per road kind. */
export const ROADS: Readonly<Record<RoadKind, { width: number; lanes: number; limit: number }>> = {
  avenue: { width: 16, lanes: 4, limit: 17 },
  street: { width: 10, lanes: 2, limit: 12.5 },
  alley: { width: 7, lanes: 2, limit: 8 },
  coast: { width: 11, lanes: 2, limit: 20 },
};
export const SIDEWALK = 3;

/**
 * District grammar: how the shared lattice is bent into each district's street pattern, and what gets built on it.
 * `jitter` moves junctions (m), `drop` removes minor links (bigger blocks, dead ends), `curve` bows the links,
 * `avenueEvery` promotes every n-th lattice line to an avenue (0 = none, 1 = all).
 */
export interface Grammar {
  jitter: number;
  drop: number;
  curve: number;
  avenueEvery: number;
  minor: RoadKind;
  /** Lots: frontage and depth ranges (m), height range (m), gap between buildings (m), share of lots left empty. */
  lot: readonly [number, number];
  depth: readonly [number, number];
  height: readonly [number, number];
  gap: number;
  empty: number;
}

export const GRAMMAR: Readonly<Record<DistrictId, Grammar>> = {
  // Downtown grid: tight regular blocks, an avenue every third line, towers.
  neon: { jitter: 1.5, drop: 0.05, curve: 0, avenueEvery: 3, minor: 'street', lot: [16, 30], depth: [16, 26], height: [18, 72], gap: 0.6, empty: 0.04 },
  // Industrial port: wide roads everywhere, a third of the links removed to make long yards, low sheds.
  harbor: { jitter: 2, drop: 0.34, curve: 0, avenueEvery: 2, minor: 'avenue', lot: [30, 58], depth: [22, 40], height: [8, 16], gap: 6, empty: 0.22 },
  // Organic old town: junctions wander, links bow, alleys and dead ends, low houses shoulder to shoulder.
  oldtown: { jitter: 15, drop: 0.2, curve: 9, avenueEvery: 0, minor: 'alley', lot: [9, 16], depth: [10, 15], height: [8, 17], gap: 0.2, empty: 0.06 },
  // Coastal cliff road: one bowed two-lane road, nothing built beside it.
  coast: { jitter: 9, drop: 0, curve: 13, avenueEvery: 0, minor: 'coast', lot: [0, 0], depth: [0, 0], height: [0, 0], gap: 0, empty: 1 },
};

/** Lattice lines of the Harbor + Neon Strip slice (m). Spacing changes where the districts meet. */
export const XS: readonly number[] = [-704, -616, -528, -440, -352, -256, -144, -32, 80, 192, 304, 416, 528, 672];
export const ZS: readonly number[] = [-688, -520, -360, -208, -112, -16, 80, 176, 272, 368, 464, 560, 672];
export const WORLD_HALF = 768;

/** Which district a point belongs to (the lattice is aligned to these borders). */
export function districtAt(x: number, z: number): DistrictId {
  if (z < -212) return 'harbor';
  if (x > 600 || z > 616) return 'coast';
  if (x < -260) return 'oldtown';
  return 'neon';
}
