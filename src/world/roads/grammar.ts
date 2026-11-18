import type { DistrictId, RoadKind } from '../../types/world';
export { districtAt, isWater, WORLD_HALF } from '../../data/world/districtMap';

/** Road widths (m), total lanes and traffic speed limits (m/s) per road kind. */
export const ROADS: Readonly<Record<RoadKind, { width: number; lanes: number; limit: number }>> = {
  highway: { width: 20, lanes: 6, limit: 30 },
  bridge: { width: 20, lanes: 6, limit: 30 },
  runway: { width: 20, lanes: 4, limit: 40 },
  avenue: { width: 16, lanes: 4, limit: 17 },
  street: { width: 11, lanes: 2, limit: 12.5 },
  alley: { width: 10, lanes: 2, limit: 8 },
  hills: { width: 10, lanes: 2, limit: 15 },
  coast: { width: 11, lanes: 2, limit: 20 },
};
export const SIDEWALK = 3;
/** Street lattice spacing (m): one block. The highway ring sits on lattice lines +-RING. */
export const LAT = 128;
export const RING = 2048;
/** Lattice index range: nodes at k * LAT for |k| <= LAT_N (inside the world square with a margin). */
export const LAT_N = 23;

/**
 * District grammar: how the shared 128 m lattice is bent into each district's street pattern, and what gets built.
 * `jitter` moves junctions (m), `drop` removes links that are not needed for connectivity (bigger blocks), `curve` bows
 * links, `avenueEvery` promotes every n-th lattice line to an avenue (0 = none). Lots: frontage/depth/height ranges (m),
 * gap between buildings, share of lots left empty.
 */
export interface Grammar {
  jitter: number;
  drop: number;
  curve: number;
  avenueEvery: number;
  minor: RoadKind;
  lot: readonly [number, number];
  depth: readonly [number, number];
  height: readonly [number, number];
  gap: number;
  empty: number;
}

export const GRAMMAR: Readonly<Record<DistrictId, Grammar>> = {
  downtown: { jitter: 0, drop: 0.04, curve: 0, avenueEvery: 3, minor: 'street', lot: [18, 34], depth: [18, 30], height: [30, 160], gap: 1, empty: 0.03 },
  strip: { jitter: 0, drop: 0.08, curve: 0, avenueEvery: 2, minor: 'street', lot: [24, 44], depth: [20, 34], height: [14, 60], gap: 1, empty: 0.05 },
  harbour: { jitter: 4, drop: 0.42, curve: 0, avenueEvery: 2, minor: 'avenue', lot: [30, 60], depth: [24, 42], height: [8, 18], gap: 6, empty: 0.25 },
  oldtown: { jitter: 26, drop: 0.24, curve: 14, avenueEvery: 0, minor: 'alley', lot: [9, 16], depth: [10, 15], height: [8, 18], gap: 0.3, empty: 0.06 },
  hills: { jitter: 34, drop: 0.55, curve: 30, avenueEvery: 0, minor: 'hills', lot: [16, 26], depth: [14, 22], height: [6, 11], gap: 14, empty: 0.55 },
  industrial: { jitter: 6, drop: 0.5, curve: 0, avenueEvery: 3, minor: 'street', lot: [40, 80], depth: [30, 60], height: [8, 22], gap: 10, empty: 0.4 },
  bay: { jitter: 0, drop: 1, curve: 0, avenueEvery: 0, minor: 'street', lot: [0, 0], depth: [0, 0], height: [0, 0], gap: 0, empty: 1 },
};
