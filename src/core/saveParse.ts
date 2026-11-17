import { sanitizeSetup } from '../data/setup';
import { sanitizeUpgrades } from '../data/upgrades';
import { sanitizeLoadout } from '../data/loadout';
import { sanitizeGraphics } from './graphics';
import type { Weather } from '../types/game';
import type { SaveData } from './save';

const WEATHERS: readonly Weather[] = ['CLEAR', 'RAIN', 'SNOW'];

export const num = (v: unknown, fallback: number, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

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
  if (typeof j.trackBest === 'object' && j.trackBest !== null) {
    for (const [k, v] of Object.entries(j.trackBest as Record<string, unknown>)) if (typeof v === 'number' && Number.isFinite(v) && v > 0 && k.length < 40) out.trackBest[k] = v;
  }
  if (typeof j.loadouts === 'object' && j.loadouts !== null) {
    for (const [id, l] of Object.entries(j.loadouts as Record<string, unknown>)) if (knownCars.includes(id)) out.loadouts[id] = sanitizeLoadout(l);
  }
  for (const [key, fn] of [['upgrades', sanitizeUpgrades], ['setups', sanitizeSetup]] as const) {
    const src = j[key];
    if (typeof src === 'object' && src !== null) for (const [id, v] of Object.entries(src as Record<string, unknown>)) if (knownCars.includes(id)) (out[key] as Record<string, unknown>)[id] = fn(v);
  }
  const s = (j.settings ?? {}) as Record<string, unknown>;
  out.settings.volume = num(s.volume, out.settings.volume, 0, 1);
  out.settings.muted = s.muted === true;
  out.settings.voice = s.voice === true;
  out.settings.autoQuality = s.autoQuality !== false;
  if (s.engineSound === 'rec' || s.engineSound === 'synth') out.settings.engineSound = s.engineSound;
  if (s.musicStyle === 'house' || s.musicStyle === 'synth') out.settings.musicStyle = s.musicStyle;
  if (s.cameraShake === 'OFF' || s.cameraShake === 'LOW' || s.cameraShake === 'NORMAL') out.settings.cameraShake = s.cameraShake;
  if (s.lang === 'en' || s.lang === 'es') out.settings.lang = s.lang; // '' = not chosen: follow the browser language
  for (const k of ['subtitleSize', 'minimapSize'] as const) if (s[k] === 'S' || s[k] === 'M' || s[k] === 'L') out.settings[k] = s[k];
  out.settings.sfxVolume = num(s.sfxVolume, out.settings.sfxVolume, 0, 1);
  out.settings.engineVolume = num(s.engineVolume, out.settings.engineVolume, 0, 1);
  if (s.engineVolume === undefined && out.settings.volume === 0.7) out.settings.volume = 0.35; // 2026-11-15: old default was too loud
  out.settings.musicVolume = num(s.musicVolume, out.settings.musicVolume, 0, 1);
  if (s.weatherPhysics === 'NORMAL' || s.weatherPhysics === 'AGGRESSIVE' || s.weatherPhysics === 'EXTREME') out.settings.weatherPhysics = s.weatherPhysics;
  if (s.assist === 'BEGINNER' || s.assist === 'STANDARD' || s.assist === 'PRO') out.settings.assist = s.assist;
  if (s.handlingModel === 'legacy' || s.handlingModel === 'v2') out.settings.handlingModel = s.handlingModel; // older saves: the default
  if (s.stability === 'OFF' || s.stability === 'LIGHT' || s.stability === 'FULL') out.settings.stability = s.stability;
  out.settings.steerSens = num(s.steerSens, 1, 0.6, 1.4);
  out.settings.rumble = s.rumble !== false;
  if (s.look === 'neon' || s.look === 'dusk' || s.look === 'grit') out.settings.look = s.look;
  if (s.difficulty === 'ROOKIE' || s.difficulty === 'STREET' || s.difficulty === 'PRO' || s.difficulty === 'LEGEND') out.settings.difficulty = s.difficulty;
  out.settings.padDeadzone = num(s.padDeadzone, 0.12, 0.02, 0.4);
  const cr = (j.career ?? {}) as Record<string, unknown>;
  if (Array.isArray(cr.completed)) out.career.completed = cr.completed.filter((id): id is string => typeof id === 'string');
  out.career.seenIntro = cr.seenIntro === true;
  out.career.endingSeen = cr.endingSeen === true;
  out.career.epilogueSeen = cr.epilogueSeen === true;
  if (typeof cr.flags === 'object' && cr.flags !== null) for (const [k, v] of Object.entries(cr.flags as Record<string, unknown>)) if (v === true && k.length < 30) out.career.flags[k] = true;
  if (typeof cr.rel === 'object' && cr.rel !== null) for (const [k, v] of Object.entries(cr.rel as Record<string, unknown>)) if (typeof v === 'number' && k.length < 30) out.career.rel[k] = Math.max(-5, Math.min(5, Math.round(v)));
  if (s.quality === 'low' || s.quality === 'medium' || s.quality === 'high' || s.quality === 'ultra') out.settings.quality = s.quality;
  out.settings.graphics = sanitizeGraphics(s.graphics, out.settings.quality);
  return out;
}

