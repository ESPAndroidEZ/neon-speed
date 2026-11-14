import type { PhysicsLevel } from '../physics/weatherLevels';
import type { Weather } from '../types/game';
import { defaultCareer, type CareerState } from './career';

export type Quality = 'low' | 'medium' | 'high';

export interface SaveData {
  version: 1;
  cash: number;
  owned: string[];
  selected: string;
  /** Paint per car id (0xRRGGBB). */
  paint: Record<string, number>;
  /** Underglow colour per car id. */
  glow: Record<string, number>;
  /** Best lap in seconds per weather, null = none yet. */
  bestLap: Record<Weather, number | null>;
  settings: { volume: number; muted: boolean; quality: Quality; voice: boolean; autoQuality: boolean; weatherPhysics: PhysicsLevel };
  races: number;
  career: CareerState;
}

/** Minimal storage shape so tests can pass an in-memory object. localStorage satisfies it. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'racers-blood-save-v1';
const WEATHERS: readonly Weather[] = ['CLEAR', 'RAIN', 'SNOW'];

export const defaultSave = (starterId: string, starterPaint: number): SaveData => ({
  version: 1,
  cash: 2500,
  owned: [starterId],
  selected: starterId,
  paint: { [starterId]: starterPaint },
  glow: {},
  bestLap: { CLEAR: null, RAIN: null, SNOW: null },
  settings: { volume: 0.7, muted: false, quality: 'high', voice: false, autoQuality: true, weatherPhysics: 'AGGRESSIVE' },
  races: 0,
  career: defaultCareer(),
});

const num = (v: unknown, fallback: number, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

/** Parse and sanitise stored JSON. Anything corrupt falls back to defaults field by field; never throws. */
export function parseSave(raw: string | null, base: SaveData, knownCars: readonly string[]): SaveData {
  const out: SaveData = JSON.parse(JSON.stringify(base)) as SaveData;
  if (!raw) return out;
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return out;
  }
  if (typeof j !== 'object' || j === null) return out;
  out.cash = Math.floor(num(j.cash, out.cash, 0, 1e9));
  out.races = Math.floor(num(j.races, 0, 0, 1e6));
  if (Array.isArray(j.owned)) {
    const owned = j.owned.filter((id): id is string => typeof id === 'string' && knownCars.includes(id));
    if (owned.length > 0) out.owned = [...new Set(owned)];
  }
  out.selected = typeof j.selected === 'string' && out.owned.includes(j.selected) ? j.selected : out.owned[0];
  if (typeof j.paint === 'object' && j.paint !== null) {
    for (const [id, c] of Object.entries(j.paint as Record<string, unknown>)) if (knownCars.includes(id)) out.paint[id] = num(c, 0xffffff, 0, 0xffffff);
  }
  if (typeof j.glow === 'object' && j.glow !== null) {
    for (const [id, c] of Object.entries(j.glow as Record<string, unknown>)) if (knownCars.includes(id)) out.glow[id] = num(c, 0x2a6bff, 0, 0xffffff);
  }
  if (typeof j.bestLap === 'object' && j.bestLap !== null) {
    const b = j.bestLap as Record<string, unknown>;
    for (const w of WEATHERS) out.bestLap[w] = typeof b[w] === 'number' && (b[w] as number) > 5 ? (b[w] as number) : null;
  }
  const s = (j.settings ?? {}) as Record<string, unknown>;
  out.settings.volume = num(s.volume, out.settings.volume, 0, 1);
  out.settings.muted = s.muted === true;
  out.settings.voice = s.voice === true;
  out.settings.autoQuality = s.autoQuality !== false;
  if (s.weatherPhysics === 'NORMAL' || s.weatherPhysics === 'AGGRESSIVE' || s.weatherPhysics === 'EXTREME') out.settings.weatherPhysics = s.weatherPhysics;
  const cr = (j.career ?? {}) as Record<string, unknown>;
  if (Array.isArray(cr.completed)) out.career.completed = cr.completed.filter((id): id is string => typeof id === 'string');
  out.career.seenIntro = cr.seenIntro === true;
  out.career.endingSeen = cr.endingSeen === true;
  if (s.quality === 'low' || s.quality === 'medium' || s.quality === 'high') out.settings.quality = s.quality;
  return out;
}

/** Save game state with explicit commit(); tolerant of missing or blocked storage. */
export class SaveStore {
  data: SaveData;
  private readonly kv: KeyValueStore | null;

  constructor(kv: KeyValueStore | null, base: SaveData, knownCars: readonly string[]) {
    this.kv = kv;
    let raw: string | null = null;
    try {
      raw = kv?.getItem(KEY) ?? null;
    } catch {
      raw = null;
    }
    this.data = parseSave(raw, base, knownCars);
  }

  commit(): void {
    try {
      this.kv?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked: play on without saving */
    }
  }

  owns(id: string): boolean {
    return this.data.owned.includes(id);
  }

  /** Spend cash on a car. False if already owned or too poor. */
  buy(id: string, price: number): boolean {
    if (this.owns(id) || this.data.cash < price) return false;
    this.data.cash -= price;
    this.data.owned.push(id);
    this.commit();
    return true;
  }

  select(id: string): void {
    if (this.owns(id)) this.data.selected = id;
    this.commit();
  }

  setPaint(id: string, color: number): void {
    this.data.paint[id] = color;
    this.commit();
  }

  setGlow(id: string, color: number): void {
    this.data.glow[id] = color;
    this.commit();
  }

  /** Bank a finished race: cash and best lap for the weather. Returns true if the lap is a new record. */
  recordRace(cash: number, bestLap: number, weather: Weather): boolean {
    this.data.cash += Math.max(0, Math.floor(cash));
    this.data.races++;
    const prev = this.data.bestLap[weather];
    const record = Number.isFinite(bestLap) && (prev === null || bestLap < prev);
    if (record) this.data.bestLap[weather] = bestLap;
    this.commit();
    return record;
  }
}
