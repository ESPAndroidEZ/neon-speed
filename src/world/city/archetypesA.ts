import type { Archetype } from './archetypes';

export const ARCHETYPES_A: Archetype[] = [
  { id: 'harbor-warehouse', kind: 'metal', height: [10, 18], tint: [0.4, 0.42, 0.45], shop: false, balcony: 0, ac: 0.05, escape: 0, roof: 'flat', districts: ['kestrel', 'maze'], weight: 2 },
  { id: 'office-grid', kind: 'glass', height: [40, 80], tint: [0.45, 0.52, 0.6], shop: true, balcony: 0, ac: 0.03, escape: 0, roof: 'antenna', districts: ['neon', 'kestrel'], weight: 2 },
  { id: 'row-houses', kind: 'brick', height: [12, 20], tint: [0.55, 0.48, 0.4], shop: true, balcony: 0.2, ac: 0.08, escape: 0.05, roof: 'tank', districts: ['kestrel', 'maze'], weight: 2 },
  { id: 'parking-deck', kind: 'concrete', height: [10, 24], tint: [0.48, 0.48, 0.5], shop: false, balcony: 0, ac: 0, escape: 0, roof: 'flat', districts: ['*'], weight: 1 },
  { id: 'loft-conversion', kind: 'brick', height: [18, 30], tint: [0.52, 0.45, 0.38], shop: true, balcony: 0.18, ac: 0.06, escape: 0.04, roof: 'antenna', districts: ['kestrel', 'neon'], weight: 2 },
];
