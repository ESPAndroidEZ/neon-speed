import type { RaceResult } from '../core/raceResult';

/** Lifetime driver record. Lives under its own localStorage key (`ns.stats`), not in the game save, so the save contract is untouched. */
export interface DriverStats {
  races: number;
  wins: number;
  podiums: number;
  /** Races where the player did not finish. */
  dnf: number;
  laps: number;
  /** Seconds spent racing (finished races only). */
  seconds: number;
  cash: number;
  bestDrift: number;
}

export const STATS_KEY = 'ns.stats';
const FIELDS: readonly (keyof DriverStats)[] = ['races', 'wins', 'podiums', 'dnf', 'laps', 'seconds', 'cash', 'bestDrift'];

export function newStats(): DriverStats {
  return { races: 0, wins: 0, podiums: 0, dnf: 0, laps: 0, seconds: 0, cash: 0, bestDrift: 0 };
}

/** Parse stored JSON; anything missing, negative, or not a number becomes 0. */
export function parseStats(raw: string | null): DriverStats {
  const s = newStats();
  try {
    const o = JSON.parse(raw ?? 'null') as Record<string, unknown> | null;
    if (o && typeof o === 'object') for (const k of FIELDS) { const n = Number(o[k]); s[k] = Number.isFinite(n) && n > 0 ? Math.min(n, 1e12) : 0; }
  } catch {
    /* bad data: start fresh */
  }
  return s;
}

/** Add one finished race. The player's own row decides finished or not. */
export function addRace(s: DriverStats, r: RaceResult): void {
  const me = r.racers.find((x) => x.isPlayer);
  const done = !!me && me.time !== null;
  s.races++;
  if (!done) { s.dnf++; return; }
  if (r.position === 1) s.wins++;
  if (r.position <= 3) s.podiums++;
  s.laps += Math.max(1, r.lapTimes?.length ?? 1);
  s.seconds += Math.max(0, r.totalTime);
  s.cash += Math.max(0, r.cash);
  s.bestDrift = Math.max(s.bestDrift, r.driftScore);
}

/** Record a race into localStorage. Never throws (private mode, full storage). */
export function recordRace(r: RaceResult): void {
  try {
    const s = parseStats(localStorage.getItem(STATS_KEY));
    addRace(s, r);
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* stats are a nicety */
  }
}

export function loadStats(): DriverStats {
  try {
    return parseStats(localStorage.getItem(STATS_KEY));
  } catch {
    return newStats();
  }
}
