import type { CarSpec } from './cars';
import { findCar } from './cars';
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
  bio: string;
}

export const RIVALS: readonly Rival[] = [
  { id: 'tank', name: 'Tank', crew: 'street', carId: 'civic', color: 0x2fa84f, skill: 0.22, bio: 'Heavy foot, light brain.' },
  { id: 'pixel', name: 'Pixel', crew: 'street', carId: 'civic', color: 0xff2a9d, skill: 0.3, bio: 'Streams every race. Mostly brakes late.' },
  { id: 'lola', name: 'Lola', crew: 'street', carId: '350z', color: 0x7a2fd6, skill: 0.4, bio: 'Dock rat. Knows every puddle.' },
  { id: 'rook', name: 'Rook', crew: 'street', carId: 'rx7', color: 0xf2c200, skill: 0.5, bio: 'Ex-Redline. Left on bad terms.' },
  { id: 'vex', name: 'Vex', crew: 'redline', carId: 'evo', color: 0x14141a, skill: 0.7, bio: 'Redline enforcer. Never lifts.' },
  { id: 'kilo', name: 'Kilo', crew: 'redline', carId: 'rx7', color: 0xc41a2b, skill: 0.78, bio: 'Redline lieutenant. Counts your mistakes.' },
  { id: 'dante', name: 'Dante Voss', crew: 'redline', carId: 'supra', color: 0x14141a, skill: 0.92, bio: 'Calm, polite, ruthless. Owns the Loop.' },
];

export const findRival = (id: string): Rival => RIVALS.find((r) => r.id === id) ?? RIVALS[0];

export interface FieldEntry {
  agent: AIRacerAgent;
  car: CarSpec;
  paint: number;
}

/** Turn rival ids into race entries (agent + car + paint). `skillScale` lets story events make a field easier or harder. */
export function buildField(ids: readonly string[], skillScale = 1): FieldEntry[] {
  return ids.map((id) => {
    const r = findRival(id);
    return { agent: createAIRacer(r.id, r.name, Math.min(1, r.skill * skillScale)), car: findCar(r.carId), paint: r.color };
  });
}

/** A mixed free-race field of `count` rivals, weakest first so the front of the grid is the strongest. */
export function freeRaceField(count: number): FieldEntry[] {
  if (count <= 0) return [];
  const pool = RIVALS.filter((r) => r.id !== 'dante');
  const pick = [...pool].sort((a, b) => a.skill - b.skill);
  const step = pick.length / count;
  return buildField(Array.from({ length: count }, (_, i) => pick[Math.min(pick.length - 1, Math.floor(i * step + step / 2))].id));
}
