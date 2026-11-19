import type { KeyValueStore } from './save';

/** Bump when the snapshot layout changes, and add a step to MIGRATIONS. */
export const SAVE_VERSION = 1;
const KEY = 'racers-blood-slots';
export const MANUAL_SLOTS = 5;
export type SlotId = 0 | 1 | 2 | 3 | 4 | 'auto';

/** What the load screen shows. */
export interface SaveSummary {
  eventTitle: string | null;
  carName: string;
  lap: number;
  laps: number;
  position: number;
  racers: number;
  weather: string;
  raceTime: number;
}

/** Enough to rebuild the race: which car, rivals and event, plus the exact state of every module. */
export interface GameSnapshot {
  version: number;
  savedAt: number;
  summary: SaveSummary;
  setup: { carId: string; paint: number; glow: number | null; weather: string; laps: number; rivalIds: string[]; skillScale: number; wet: boolean; eventId: string | null; weatherChange: { at: number; to: string } | null; trackId?: string; level?: string; raceId?: string };
  race: unknown;
  weather: string;
  weatherIntensity: number;
  physicsLevel: string;
  surfaceSeed: number;
}

/**
 * Old layouts are upgraded one version at a time. Return null if a save cannot be upgraded.
 * (None yet: version 1 is the first. Add `[1]: (o) => ({ ...o, version: 2, newField: 0 })` when the layout changes.)
 */
const MIGRATIONS: Record<number, (o: Record<string, unknown>) => Record<string, unknown> | null> = {};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validate and migrate untrusted data. Returns null for anything corrupt, from the future, or not upgradable. Never throws. */
export function parseSnapshot(raw: unknown): GameSnapshot | null {
  try {
    if (!isObj(raw) || !isNum(raw.version)) return null;
    let o: Record<string, unknown> | null = raw;
    let v = raw.version;
    if (v > SAVE_VERSION || v < 1) return null;
    while (v < SAVE_VERSION) {
      const step = MIGRATIONS[v] as ((x: Record<string, unknown>) => Record<string, unknown> | null) | undefined;
      o = step !== undefined && o ? step(o) : null;
      if (!o) return null;
      v = isNum(o.version) ? o.version : -1;
      if (v < 0) return null;
    }
    const s = o?.summary;
    const u = o?.setup;
    if (!o || !isNum(o.savedAt) || !isObj(s) || !isObj(u) || !isObj(o.race)) return null;
    if (typeof s.carName !== 'string' || !isNum(s.lap) || !isNum(s.laps) || !isNum(s.position) || !isNum(s.raceTime) || typeof s.weather !== 'string') return null;
    if (typeof u.carId !== 'string' || !isNum(u.paint) || !isNum(u.laps) || !Array.isArray(u.rivalIds) || !u.rivalIds.every((x) => typeof x === 'string')) return null;
    const race = o.race;
    if (typeof race.phase !== 'string' || !isNum(race.raceTime) || !Array.isArray(race.racers) || race.racers.length === 0) return null;
    if (typeof o.weather !== 'string' || !isNum(o.weatherIntensity) || !isNum(o.surfaceSeed)) return null;
    return o as unknown as GameSnapshot;
  } catch {
    return null;
  }
}

/** Five manual slots plus an autosave (older 3-slot saves load with slots 4-5 empty), in one localStorage entry. Tolerates missing, blocked or corrupt storage. */
export class SaveSlots {
  private slots: (GameSnapshot | null)[] = [null, null, null, null, null];
  private auto: GameSnapshot | null = null;
  private readonly kv: KeyValueStore | null;
  /** Set when stored data was unreadable (for a one-off warning). */
  corrupt = false;

  constructor(kv: KeyValueStore | null) {
    this.kv = kv;
    this.load();
  }

  private load(): void {
    let raw: string | null = null;
    try {
      raw = this.kv?.getItem(KEY) ?? null;
    } catch {
      raw = null;
    }
    if (!raw) return;
    try {
      const j: unknown = JSON.parse(raw);
      if (!isObj(j) || !Array.isArray(j.slots)) throw new Error('bad shape');
      this.slots = [0, 1, 2, 3, 4].map((i) => parseSnapshot(j.slots instanceof Array ? j.slots[i] : null));
      this.auto = parseSnapshot(j.auto);
      this.corrupt = this.slots.some((s, i) => s === null && (j.slots as unknown[])[i] != null) || (this.auto === null && j.auto != null);
    } catch {
      this.corrupt = true;
    }
  }

  get(id: SlotId): GameSnapshot | null {
    return id === 'auto' ? this.auto : this.slots[id];
  }

  put(id: SlotId, snap: GameSnapshot): boolean {
    if (id === 'auto') this.auto = snap;
    else this.slots[id] = snap;
    try {
      this.kv?.setItem(KEY, JSON.stringify({ slots: this.slots, auto: this.auto }));
      return true;
    } catch {
      return false; // storage full or blocked: the save lives for this session only
    }
  }

  /** The most recent save of any kind, or null. */
  latest(): { id: SlotId; snap: GameSnapshot } | null {
    let best: { id: SlotId; snap: GameSnapshot } | null = null;
    for (const id of [0, 1, 2, 3, 4, 'auto'] as SlotId[]) {
      const snap = this.get(id);
      if (snap && (!best || snap.savedAt > best.snap.savedAt)) best = { id, snap };
    }
    return best;
  }
}
