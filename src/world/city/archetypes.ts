import { ARCHETYPES_A } from './archetypesA';
import { ARCHETYPES_B } from './archetypesB';
import type { FacadeKind } from './textures';

/**
 * A building archetype: what one run of facade is made of. `buildFacades` picks one per run (by `weight`, per district), and
 * `layoutDetails` uses its rates. Reference implementation: 'shopfront-tower'. Add archetypes by adding entries (docs/tasks: 10 archetypes):
 * pure data, no code, every rate 0..1, every field required.
 */
export interface Archetype {
  id: string;
  /** Wall material (and texture sheet). */
  kind: FacadeKind;
  /** Height range in metres (floors are 3.2 m). */
  height: readonly [number, number];
  /** Wall tint (multiplies the albedo). */
  tint: readonly [number, number, number];
  /** Ground-floor shopfront on most runs. */
  shop: boolean;
  /** Chance per bay: balconies, AC units, fire escape (alleys only). */
  balcony: number;
  ac: number;
  escape: number;
  /** Rooftop: what sits on top most of the time. */
  roof: 'tank' | 'antenna' | 'billboard' | 'flat';
  /** Districts it appears in ('*' = all) and its relative frequency. */
  districts: readonly string[];
  weight: number;
}

const BASE: Archetype[] = [
  { id: 'concrete-block', kind: 'concrete', height: [14, 40], tint: [0.5, 0.5, 0.52], shop: true, balcony: 0.08, ac: 0.12, escape: 0.02, roof: 'antenna', districts: ['*'], weight: 3 },
  { id: 'glass-tower', kind: 'glass', height: [34, 70], tint: [0.45, 0.5, 0.62], shop: true, balcony: 0, ac: 0.02, escape: 0, roof: 'billboard', districts: ['neon', 'kestrel'], weight: 2 },
  { id: 'old-apartments', kind: 'brick', height: [12, 28], tint: [0.58, 0.5, 0.38], shop: true, balcony: 0.14, ac: 0.1, escape: 0.08, roof: 'tank', districts: ['kestrel'], weight: 2 },
  { id: 'neon-slab', kind: 'glass', height: [24, 52], tint: [0.45, 0.38, 0.5], shop: true, balcony: 0, ac: 0.03, escape: 0, roof: 'antenna', districts: ['neon'], weight: 2 },
  { id: 'shopfront-tower', kind: 'brick', height: [16, 44], tint: [0.55, 0.45, 0.42], shop: true, balcony: 0.05, ac: 0.09, escape: 0.03, roof: 'tank', districts: ['*'], weight: 3 },
];

/** Every archetype in play: the reference set plus the Qwen sets (A, B ...). */
export const ARCHETYPES: Archetype[] = [...BASE, ...ARCHETYPES_A, ...ARCHETYPES_B];

/** Archetypes allowed in a district, in list order. */
export const archetypesFor = (district: string, all: readonly Archetype[] = ARCHETYPES): Archetype[] => all.filter((a) => a.districts.includes('*') || a.districts.includes(district));

/** Weighted pick: `r` is a uniform 0..1 number from the caller's seeded rng. */
export function pickArchetype(list: readonly Archetype[], r: number): Archetype {
  const total = list.reduce((s, a) => s + a.weight, 0);
  let x = r * total;
  for (const a of list) if ((x -= a.weight) < 0) return a;
  return list[list.length - 1];
}

/** Everything wrong with an archetype list (empty = valid): used by the validation test and by CI. */
export function validateArchetypes(list: readonly Archetype[]): string[] {
  const bad: string[] = [];
  const ids = new Set<string>();
  for (const a of list) {
    if (ids.has(a.id)) bad.push(`duplicate id ${a.id}`);
    ids.add(a.id);
    if (a.height[0] < 8 || a.height[1] > 120 || a.height[0] >= a.height[1]) bad.push(`${a.id}: height range`);
    if (a.tint.some((t) => t < 0.2 || t > 1)) bad.push(`${a.id}: tint`);
    if ([a.balcony, a.ac, a.escape].some((r) => r < 0 || r > 1)) bad.push(`${a.id}: rates`);
    if (a.weight <= 0 || a.districts.length === 0) bad.push(`${a.id}: weight or districts`);
  }
  return bad;
}
