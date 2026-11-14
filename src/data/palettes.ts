/** District colour identity (docs/art-direction.md): the key light, an accent, and how the sky is pushed in each map. */
export interface Palette {
  /** Key light colour (lamps, glow), accent colours for signs and rails. */
  key: number;
  accent: readonly [number, number];
  /** Sky horizon glow and fog tint multipliers on top of the look. */
  horizon: number;
  fog: number;
  /** Colour of the distant skyline silhouettes' lit windows. */
  window: number;
  /** Skyline: number of towers and their height range, 0 = open horizon (coast). */
  skyline: { count: number; min: number; max: number };
}

export const PALETTES: Record<string, Palette> = {
  kestrel: { key: 0xff9a2e, accent: [0x1fb5a8, 0xff2a9d], horizon: 0xb85a22, fog: 0x1a1210, window: 0xffc070, skyline: { count: 90, min: 40, max: 130 } },
  neon: { key: 0xff2a9d, accent: [0x18d8ff, 0x7a2fd6], horizon: 0x9a1f7a, fog: 0x160a22, window: 0x9fe8ff, skyline: { count: 140, min: 70, max: 260 } },
  maze: { key: 0xff9a2e, accent: [0xe0b020, 0x9fe8ff], horizon: 0x8a4a1a, fog: 0x14100c, window: 0xffb050, skyline: { count: 60, min: 25, max: 80 } },
  'maze-drift': { key: 0xff9a2e, accent: [0xe0b020, 0x9fe8ff], horizon: 0x8a4a1a, fog: 0x14100c, window: 0xffb050, skyline: { count: 60, min: 25, max: 80 } },
  cliff: { key: 0x8fa4ff, accent: [0xffa030, 0xe8f0ff], horizon: 0x2a4a8a, fog: 0x0a1020, window: 0xffffff, skyline: { count: 0, min: 0, max: 0 } },
};

export const paletteOf = (id: string): Palette => PALETTES[id] ?? PALETTES.kestrel;
