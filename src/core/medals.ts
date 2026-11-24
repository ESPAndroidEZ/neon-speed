import type { Weather } from '../types/game';

/**
 * Time Attack medals (docs/nfs-vision.md section 2): every map has a par time (a full-skill AI in the RX-7 on a dry road
 * for the map's lap count, measured with tests/lab/medal-par.mts); gold, silver and bronze are a little slower than
 * that, and wet roads are given extra time. Drift maps score the drift points instead. Pure.
 */
export type Medal = 'gold' | 'silver' | 'bronze';

export const PAR: Readonly<Record<string, number>> = { kestrel: 178, neon: 224, maze: 256, cliff: 68, mountain: 315, coast: 322 };
const WET: Record<Weather, number> = { CLEAR: 1, RAIN: 1.12, SNOW: 1.15 };
const K: Record<Medal, number> = { gold: 1.04, silver: 1.14, bronze: 1.3 };
/** Drift maps: the target score times this for each medal (bronze = the target itself). */
const DRIFT_K: Record<Medal, number> = { gold: 2, silver: 1.5, bronze: 1 };
export const MEDALS: readonly Medal[] = ['gold', 'silver', 'bronze'];
export const MEDAL_PAY: Readonly<Record<Medal, { cash: number; rep: number }>> = { bronze: { cash: 500, rep: 40 }, silver: { cash: 1200, rep: 80 }, gold: { cash: 2500, rep: 150 } };

export const medalRank = (m: Medal | null): number => (m === 'gold' ? 3 : m === 'silver' ? 2 : m === 'bronze' ? 1 : 0);

/** The three times (seconds) for a map in this weather; null for maps without a par (city races, drift maps). */
export function medalTimes(trackId: string, weather: Weather): Record<Medal, number> | null {
  const par = PAR[trackId];
  if (!par) return null;
  return { gold: Math.round(par * WET[weather] * K.gold), silver: Math.round(par * WET[weather] * K.silver), bronze: Math.round(par * WET[weather] * K.bronze) };
}

/** The medal a finish time earns (null = none, or no time). */
export function medalFor(trackId: string, weather: Weather, time: number | undefined): Medal | null {
  const m = medalTimes(trackId, weather);
  if (!m || !time || !(time > 0)) return null;
  return MEDALS.find((k) => time <= m[k]) ?? null;
}

/** The three scores for a drift map. */
export const driftTimes = (target: number): Record<Medal, number> => ({ gold: Math.round(target * DRIFT_K.gold), silver: Math.round(target * DRIFT_K.silver), bronze: Math.round(target * DRIFT_K.bronze) });

export function driftMedal(target: number | undefined, score: number | undefined): Medal | null {
  if (!target || !score) return null;
  const m = driftTimes(target);
  return MEDALS.find((k) => score >= m[k]) ?? null;
}
