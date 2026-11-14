import type { Archetype } from './archetypes';

export const ARCHETYPES_B: Archetype[] = [
  { id: 'art-deco-hotel', kind: 'concrete', height: [26, 48], tint: [0.5, 0.48, 0.45], shop: true, balcony: 0.1, ac: 0.15, escape: 0.02, roof: 'billboard', districts: ['neon', 'kestrel'], weight: 2 },
  { id: 'noodle-arcade', kind: 'brick', height: [10, 16], tint: [0.55, 0.42, 0.35], shop: true, balcony: 0.05, ac: 0.2, escape: 0.05, roof: 'tank', districts: ['*'], weight: 3 },
  { id: 'radio-block', kind: 'concrete', height: [20, 36], tint: [0.48, 0.48, 0.5], shop: true, balcony: 0.06, ac: 0.1, escape: 0.02, roof: 'antenna', districts: ['*'], weight: 2 },
  { id: 'tenement', kind: 'brick', height: [14, 26], tint: [0.52, 0.45, 0.38], shop: true, balcony: 0.1, ac: 0.08, escape: 0.12, roof: 'tank', districts: ['*'], weight: 3 },
  { id: 'bank-slab', kind: 'glass', height: [30, 60], tint: [0.4, 0.45, 0.55], shop: true, balcony: 0, ac: 0.02, escape: 0, roof: 'flat', districts: ['neon', 'kestrel'], weight: 2 },
];
