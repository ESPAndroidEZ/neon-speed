import type { RoamSave } from '../types/world';

const HALF = 3072; // WORLD_HALF (data/world/districtMap): positions outside are refused
const ID = /^[a-z0-9:_-]{1,40}$/;
const CELL = /^\d{1,2},\d{1,2}$/;

const ids = (v: unknown, re: RegExp, max: number): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && re.test(x)))].slice(0, max) : []);

/**
 * The Free Drive part of a save (`SaveData.roam`, contract `RoamSave` in types/world.ts), checked field by field: a bad
 * or hostile value is dropped, never trusted; anything unreadable gives null (no roam progress) instead of an error.
 */
export function parseRoam(v: unknown): RoamSave | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  const fin = (x: unknown, lo: number, hi: number, d: number): number => (typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi ? x : d);
  const best: Record<string, number> = {};
  if (r.best && typeof r.best === 'object') {
    let n = 0;
    for (const [k, x] of Object.entries(r.best as Record<string, unknown>)) {
      if (n >= 200) break;
      if (ID.test(k) && typeof x === 'number' && Number.isFinite(x) && x > 0 && x < 1e9) { best[k] = x; n++; }
    }
  }
  const quests = r.quests && typeof r.quests === 'object' && JSON.stringify(r.quests).length < 20000 ? r.quests : null;
  return {
    x: fin(r.x, -HALF, HALF, 0), z: fin(r.z, -HALF, HALF, 0), heading: fin(r.heading, -100, 100, 0), hour: fin(r.hour, 0, 24, 22),
    seen: ids(r.seen, CELL, 48 * 48), hands: ids(r.hands, ID, 200), visited: ids(r.visited, ID, 200), best, quests,
  };
}

/** A fresh roam record (first Free Drive). */
export const emptyRoam = (): RoamSave => ({ x: 0, z: 0, heading: 0, hour: 22, seen: [], hands: [], visited: [], best: {}, quests: null });
