export interface FacadeVariant {
  id: string;
  kind: 'brick' | 'concrete' | 'metal' | 'glass';
  seed: number;
  base: string;
}

export const FACADE_VARIANTS: FacadeVariant[] = [
  // brick
  { id: 'brick-red', kind: 'brick', seed: 1, base: '#8B3A2F' },
  { id: 'brick-brown', kind: 'brick', seed: 2, base: '#6B4226' },
  { id: 'brick-yellow', kind: 'brick', seed: 3, base: '#C4A35A' },
  { id: 'brick-white', kind: 'brick', seed: 4, base: '#E8E0D8' },
  // concrete
  { id: 'concrete-grey', kind: 'concrete', seed: 5, base: '#8A8A8A' },
  { id: 'concrete-warm', kind: 'concrete', seed: 6, base: '#9E9488' },
  { id: 'concrete-cool', kind: 'concrete', seed: 7, base: '#8A9098' },
  { id: 'concrete-stained', kind: 'concrete', seed: 8, base: '#7A7268' },
  // metal
  { id: 'metal-blue', kind: 'metal', seed: 9, base: '#4A6A8A' },
  { id: 'metal-rust', kind: 'metal', seed: 10, base: '#8B4513' },
  // glass
  { id: 'glass-teal', kind: 'glass', seed: 11, base: '#3A8A8A' },
  { id: 'glass-bronze', kind: 'glass', seed: 12, base: '#8A6A3A' },
];

export interface RoadVariant {
  id: string;
  base: string;
  grit: number;
}

export const ROAD_VARIANTS: RoadVariant[] = [
  { id: 'fresh', base: '#2A2A2A', grit: 0.1 },
  { id: 'worn', base: '#303030', grit: 0.4 },
  { id: 'patched', base: '#282828', grit: 0.6 },
  { id: 'wet-dark', base: '#1A1A1A', grit: 0.2 },
];
