/**
 * Look presets (docs/art-direction.md). A look multiplies the weather grade: exposure, bloom, saturation, contrast, split toning,
 * anamorphic streaks, and sets the sky colours. Weather never leaves the quality bars of `npm run visual`.
 */
export type LookId = 'neon' | 'dusk' | 'grit';

export interface Look {
  id: LookId;
  name: string;
  exposure: number;
  bloomK: number;
  saturation: number;
  /** 1 = unchanged; above 1 crushes blacks and lifts highlights. */
  contrast: number;
  /** Colour pushed into shadows and highlights (split toning). */
  shadowTint: readonly [number, number, number];
  highlightTint: readonly [number, number, number];
  /** Anamorphic streak strength on bright lights (0 = off). */
  streak: number;
  /** Sky: zenith and horizon colours, star density 0..1, moon glow 0..1, cloud cover 0..1. */
  skyTop: number;
  skyHorizon: number;
  stars: number;
  moon: number;
  clouds: number;
  /** Multiplies the weather fog density. */
  fogK: number;
  grain: number;
}

export const LOOKS: Record<LookId, Look> = {
  neon: { id: 'neon', name: 'Neon Night', exposure: 1.08, bloomK: 1.05, saturation: 1.28, contrast: 1.12, shadowTint: [0.9, 0.95, 1.18], highlightTint: [1.08, 1.0, 1.1], streak: 0.55, skyTop: 0x04061c, skyHorizon: 0x5a1f5e, stars: 0.8, moon: 0.5, clouds: 0.35, fogK: 1, grain: 0.03 },
  dusk: { id: 'dusk', name: 'Dusk Heat', exposure: 1.22, bloomK: 0.85, saturation: 1.18, contrast: 1.08, shadowTint: [0.82, 0.95, 1.2], highlightTint: [1.2, 1.02, 0.84], streak: 0.35, skyTop: 0x0b1740, skyHorizon: 0xd8672a, stars: 0.25, moon: 0.2, clouds: 0.55, fogK: 0.75, grain: 0.03 },
  grit: { id: 'grit', name: 'Overcast Grit', exposure: 1.1, bloomK: 0.6, saturation: 0.78, contrast: 1.05, shadowTint: [0.96, 1.0, 1.06], highlightTint: [1.04, 1.0, 0.96], streak: 0.2, skyTop: 0x161a22, skyHorizon: 0x3a3f4a, stars: 0, moon: 0, clouds: 0.9, fogK: 1.3, grain: 0.06 },
};

export const LOOK_IDS: readonly LookId[] = ['neon', 'dusk', 'grit'];

/** The look in force (mutated in place so shaders and systems can hold the reference). */
export const look: Look = { ...LOOKS.neon };

export function setLook(id: LookId): Look {
  Object.assign(look, LOOKS[LOOK_IDS.includes(id) ? id : 'neon']);
  return look;
}
