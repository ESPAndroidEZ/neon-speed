import type { RaceResult } from '../core/raceResult';
import type { DriverStats } from './driverStats';

/** One finished race as the achievements see it (plain values, so tests can build it). */
export interface AchRace {
  result: RaceResult;
  weather: 'CLEAR' | 'RAIN' | 'SNOW';
  trackId: string;
  carId: string;
  near: number;
  slip: number;
  style: number;
  bestCombo: number;
  topKph: number;
}

/** Stored progress: unlocked ids plus the sets some badges count. Own localStorage key, not in the game save. */
export interface AchState { got: string[]; wonTracks: string[]; wonCars: string[]; wonWeathers: string[] }

export const ACH_KEY = 'ns.ach';
type Test = (r: AchRace, s: AchState, life: DriverStats, won: boolean) => boolean;

/** Every badge, in display order. Names and descriptions: i18n `ach.<id>` and `ach.<id>.d`. */
export const ACHIEVEMENTS: readonly { id: string; test: Test }[] = [
  { id: 'finish', test: (r) => finished(r) },
  { id: 'win', test: (_r, _s, _l, won) => won },
  { id: 'podium5', test: (_r, _s, l) => l.podiums >= 5 },
  { id: 'wins10', test: (_r, _s, l) => l.wins >= 10 },
  { id: 'drift10k', test: (r) => r.result.driftScore >= 10000 },
  { id: 'drift50k', test: (r) => r.result.driftScore >= 50000 },
  { id: 'near5', test: (r) => r.near >= 5 },
  { id: 'tow5', test: (r) => r.slip >= 5 },
  { id: 'combo5k', test: (r) => r.bestCombo >= 5000 },
  { id: 'style20k', test: (r) => r.style >= 20000 },
  { id: 'rain', test: (r, _s, _l, won) => won && r.weather === 'RAIN' },
  { id: 'snow', test: (r, _s, _l, won) => won && r.weather === 'SNOW' },
  { id: 'ton', test: (r) => r.topKph >= 250 },
  { id: 'weathers', test: (_r, s) => s.wonWeathers.length >= 3 },
  { id: 'tracks3', test: (_r, s) => s.wonTracks.length >= 3 },
  { id: 'cars4', test: (_r, s) => s.wonCars.length >= 4 },
  { id: 'laps100', test: (_r, _s, l) => l.laps >= 100 },
];

function finished(r: AchRace): boolean {
  const me = r.result.racers.find((x) => x.isPlayer);
  return !!me && me.time !== null;
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length < 40).slice(0, 64) : []);

/** Parse stored JSON; junk becomes an empty state. */
export function parseAch(raw: string | null): AchState {
  try {
    const o = JSON.parse(raw ?? 'null') as Record<string, unknown> | null;
    if (o && typeof o === 'object') return { got: strs(o.got), wonTracks: strs(o.wonTracks), wonCars: strs(o.wonCars), wonWeathers: strs(o.wonWeathers) };
  } catch { /* fresh start */ }
  return { got: [], wonTracks: [], wonCars: [], wonWeathers: [] };
}

const add = (list: string[], v: string): void => { if (!list.includes(v)) list.push(v); };

/** Apply one finished race (after the driver record counted it). Mutates `s`; returns the ids unlocked now. */
export function evaluateRace(s: AchState, r: AchRace, life: DriverStats): string[] {
  const won = finished(r) && r.result.position === 1 && r.result.racers.length > 1;
  if (won) { add(s.wonTracks, r.trackId); add(s.wonCars, r.carId); add(s.wonWeathers, r.weather); }
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) if (!s.got.includes(a.id) && a.test(r, s, life, won)) { s.got.push(a.id); fresh.push(a.id); }
  return fresh;
}

export function loadAch(): AchState {
  try { return parseAch(localStorage.getItem(ACH_KEY)); } catch { return parseAch(null); }
}

/** Evaluate and store; never throws. Returns the newly unlocked ids (for the toast). */
export function recordAchievements(r: AchRace, life: DriverStats): string[] {
  const s = loadAch();
  const fresh = evaluateRace(s, r, life);
  try { localStorage.setItem(ACH_KEY, JSON.stringify(s)); } catch { /* a nicety */ }
  return fresh;
}
