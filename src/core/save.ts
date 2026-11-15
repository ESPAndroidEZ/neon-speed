import { setLoadout as setLiveLoadout } from '../world/loadoutStore';
import { setBuild } from '../data/carBuild';
import { defaultSetup, type Setup } from '../data/setup';
import type { UpgradeId, Upgrades } from '../data/upgrades';
import type { Loadout } from '../data/loadout';
import { PRESETS, type Graphics } from './graphics';
import type { LookId } from './looks';
import type { Difficulty } from '../physics/aiDifficulty';
import type { AssistLevel, HandlingModel, StabilityLevel } from '../physics/assists';
import type { PhysicsLevel } from '../physics/weatherLevels';
import type { Weather } from '../types/game';
import { defaultCareer, type CareerState } from './career';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';

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
  /** Best race time (seconds) per map and weather, key `trackId:WEATHER`; `trackId:drift` holds the best drift score. */
  trackBest: Record<string, number>;
  /** Saved appearance per car id (finish, vinyl, rims, tint, lights, stance). */
  loadouts: Record<string, Loadout>;
  /** Installed performance upgrades and the tuning setup per car id. */
  upgrades: Record<string, Upgrades>;
  setups: Record<string, Setup>;
  settings: { volume: number; muted: boolean; quality: Quality; voice: boolean; autoQuality: boolean; weatherPhysics: PhysicsLevel; sfxVolume: number; engineVolume: number; musicVolume: number; cameraShake: 'OFF' | 'LOW' | 'NORMAL'; assist: AssistLevel; handlingModel: HandlingModel; stability: StabilityLevel; steerSens: number; rumble: boolean; padDeadzone: number; difficulty: Difficulty; look: LookId; graphics: Graphics };
  races: number;
  career: CareerState;
}

/** Minimal storage shape so tests can pass an in-memory object. localStorage satisfies it. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'racers-blood-save-v1';

export const defaultSave = (starterId: string, starterPaint: number): SaveData => ({
  version: 1,
  cash: 2500,
  owned: [starterId],
  selected: starterId,
  paint: { [starterId]: starterPaint },
  glow: {},
  bestLap: { CLEAR: null, RAIN: null, SNOW: null },
  trackBest: {},
  loadouts: {},
  upgrades: {},
  setups: {},
  settings: { volume: 0.35, muted: false, quality: 'high', voice: false, autoQuality: true, weatherPhysics: 'AGGRESSIVE', sfxVolume: 0.75, engineVolume: 0.6, musicVolume: 0.55, cameraShake: 'LOW', assist: 'STANDARD', handlingModel: 'legacy', stability: 'LIGHT', steerSens: 1, rumble: true, padDeadzone: 0.12, difficulty: 'STREET', look: 'neon', graphics: { ...PRESETS.high } },
  races: 0,
  career: defaultCareer(),
});

export { parseSave } from './saveParse';
import { parseSave } from './saveParse';

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
    for (const [id, l] of Object.entries(this.data.loadouts)) setLiveLoadout(id, l);
    this.syncBuilds();
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

  private syncBuilds(): void {
    for (const id of new Set([...Object.keys(this.data.upgrades), ...Object.keys(this.data.setups)])) setBuild(id, this.data.upgrades[id] ?? {}, this.data.setups[id] ?? defaultSetup());
  }

  /** Buy the next level of an upgrade if the cash is there. Returns false when it cannot be bought. */
  buyUpgrade(carId: string, id: UpgradeId, price: number): boolean {
    const have = this.data.upgrades[carId] ?? {};
    if (this.data.cash < price || (have[id] ?? 0) >= 3) return false;
    this.data.cash -= price;
    this.data.upgrades[carId] = { ...have, [id]: (have[id] ?? 0) + 1 };
    this.syncBuilds();
    this.commit();
    return true;
  }

  setSetup(carId: string, s: Setup): void {
    this.data.setups[carId] = s;
    this.syncBuilds();
    this.commit();
  }

  /** Save and apply a car's appearance. */
  setLoadout(id: string, l: Loadout): void {
    this.data.loadouts[id] = l;
    setLiveLoadout(id, l);
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

  /** Keep the best time (or best drift score, `lowerIsBetter` false) for a map; returns true on a record. */
  recordTrack(key: string, value: number, lowerIsBetter = true): boolean {
    const prev = this.data.trackBest[key];
    const record = Number.isFinite(value) && value > 0 && (prev === undefined || (lowerIsBetter ? value < prev : value > prev));
    if (record) {
      this.data.trackBest[key] = value;
      this.commit();
    }
    return record;
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
