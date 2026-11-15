/**
 * v2 tyres, pure arithmetic (no allocation). Load sensitivity: mu = mu0 * (1 - k * (Fz / Fnom - 1)), so the outside
 * wheel of an axle gains less grip than the inside one loses: the axle that takes more roll transfer loses grip share.
 */

/** Per-wheel capacities of one axle (N), written by `axleCaps`. Module scratch: read right after the call. */
export const CAP = { inner: 0, outer: 0, total: 0 };

const muAt = (mu0: number, fz: number, nom: number, k: number): number => mu0 * Math.max(0.5, 1 - k * (fz / nom - 1));

/** Axle with total load `fz` (N) and per-wheel lateral transfer `d` (outer = fz/2 + d). `nom` = nominal load per tyre. */
export function axleCaps(mu0: number, fz: number, d: number, nom: number, k: number): typeof CAP {
  const half = fz * 0.5;
  const dd = Math.min(d, half * 0.98);
  const fo = half + dd, fi = half - dd;
  CAP.outer = muAt(mu0, fo, nom, k) * fo;
  CAP.inner = muAt(mu0, fi, nom, k) * fi;
  CAP.total = CAP.outer + CAP.inner;
  return CAP;
}

/** Normalised lateral curve: 0 at no slip, 1 at the peak slip angle, falling to the slide share. Opposes the slip. */
export const lateralCurve = (alpha: number, b: number, c: number): number => -Math.sin(c * Math.atan(b * alpha));

/**
 * Drive capacity of an axle through its differential: open = twice the inner wheel; a limited-slip diff passes
 * `lock` of the difference (plus its preload) to the loaded wheel; fully locked = both wheels.
 */
export function diffCap(inner: number, outer: number, lock: number, preloadN: number): number {
  const gap = Math.max(0, outer - inner);
  return 2 * inner + Math.min(gap, gap * lock + preloadN);
}
