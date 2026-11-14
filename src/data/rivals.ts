import type { CarSpec } from './cars';
import { findCar } from './cars';
import type { Difficulty, DriveStyle } from '../physics/aiDifficulty';
import { createAIRacer } from '../physics/aiRacers';
import type { AIRacerAgent } from '../types/game';


/** Everyone you can race against. Brand names stay in cars.ts: rivals only name a car id. */
export interface Rival {
  id: string;
  name: string;
  crew: 'street' | 'redline';
  carId: string;
  color: number;
  /** 0 (rookie) .. 1 (relentless). */
  skill: number;
  /** Extra skill in rain and snow (rain specialists). */
  rain?: number;
  /** Extra skill in snow. */
  snow?: number;
  /** Driving personality. */
  style: DriveStyle;
  /** Underglow colour. */
  glow?: number;
  bio: string;
}

export const RIVALS: readonly Rival[] = [
  { id: 'pixel', style: 'clean', name: 'Pixel', crew: 'street', carId: 'civic', color: 0xff2a9d, skill: 0.28, bio: 'Streams every race. Mostly brakes late.' },
  { id: 'lola', style: 'clean', name: 'Lola', crew: 'street', carId: 'rx7', color: 0xf2c200, skill: 0.4, bio: 'Dock rat. Knows every puddle.' },
  { id: 'rook', style: 'aggressive', name: 'Rook', crew: 'street', carId: 'civic', color: 0x2fa84f, skill: 0.5, bio: 'Ex-Redline. Left on bad terms.' },
  { id: 'tank', style: 'blocker', name: 'Tank', crew: 'street', carId: 'supra', color: 0x8a8f99, skill: 0.58, bio: 'Heavy, late on the brakes, impossible to push around.' },
  { id: 'vex', style: 'drifter', name: 'Vex', crew: 'redline', carId: '350z', color: 0x7a2fd6, glow: 0xff2a9d, skill: 0.72, bio: 'Redline drifter. Lives sideways.' },
  { id: 'jinx', style: 'aggressive', name: 'Jinx', crew: 'street', carId: 'evo', color: 0x39ff88, glow: 0x39ff88, skill: 0.66, rain: 0.16, bio: 'Aggressive rain specialist. Born in a puddle.' },
  { id: 'nova', style: 'drifter', name: 'Nova', crew: 'redline', carId: 'rx7', color: 0xff4fa3, glow: 0xff2a9d, skill: 0.78, rain: 0.1, bio: 'Neon Strip drift queen. Turns every boulevard into her slide.' },
  { id: 'brick', style: 'blocker', name: 'Brick', crew: 'street', carId: 'evo', color: 0xc77b1a, skill: 0.74, snow: 0.12, bio: 'Dock union heavy hitter. Never lifts, never moves over.' },
  { id: 'calloway', style: 'late-braker', name: 'Calloway', crew: 'redline', carId: 'supra', color: 0xe8ecf4, glow: 0x18d8ff, skill: 0.86, snow: 0.06, bio: 'Owns the Cliffside and everything painted on it. Brakes later than he should.' },
  { id: 'dante', style: 'clean', name: 'Dante Voss', crew: 'redline', carId: 'rx7', color: 0x14110a, glow: 0xffb347, skill: 0.93, bio: 'Calm, polite, ruthless. Black and gold RX-7. Owns the Loop.' },
];

export const findRival = (id: string): Rival => RIVALS.find((r) => r.id === id) ?? RIVALS[0];

export interface FieldEntry {
  agent: AIRacerAgent;
  car: CarSpec;
  paint: number;
  glow?: number;
}

/** Turn rival ids into race entries (agent + car + paint). `skillScale` lets story events make a field easier or harder. */
export function buildField(ids: readonly string[], skillScale = 1, wet = false, level: Difficulty = 'STREET'): FieldEntry[] {
  return ids.map((id) => {
    const r = findRival(id);
    const skill = Math.min(1, (r.skill + (wet ? (r.rain ?? 0) + (r.snow ?? 0) : 0)) * skillScale);
    return { agent: createAIRacer(r.id, r.name, skill, { level, style: r.style }), car: findCar(r.carId), paint: r.color, glow: r.glow };
  });
}

/** A mixed free-race field of `count` rivals, weakest first so the front of the grid is the strongest. */
export function freeRaceField(count: number, level: Difficulty = 'STREET'): FieldEntry[] {
  if (count <= 0) return [];
  const pool = RIVALS.filter((r) => r.id !== 'dante' && r.id !== 'calloway');
  const pick = [...pool].sort((a, b) => a.skill - b.skill);
  const step = pick.length / count;
  return buildField(Array.from({ length: count }, (_, i) => pick[Math.min(pick.length - 1, Math.floor(i * step + step / 2))].id), 1, false, level);
}
