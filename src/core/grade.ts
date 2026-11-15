import type { Weather } from '../types/game';

/**
 * Per-weather look: exposure, bloom, colour grade and how strongly lights glow. Bad weather is darker and calmer so
 * the road edges, the car and the next ~60 m stay readable while neon still glows.
 */
export interface Grade {
  exposure: number;
  /** Multiplies the quality tier's bloom strength. */
  bloomK: number;
  bloomThreshold: number;
  /** 1 = unchanged, lower = desaturated. */
  saturation: number;
  /** Colour multiplier (cool tint in snow). */
  tint: readonly [number, number, number];
  /** Multiplies headlight / taillight / lamp glow sprites. */
  glowK: number;
  /** Multiplies headlight spot intensity. */
  spotK: number;
  /** Headlight cone half-angle (narrower in fog). */
  spotAngle: number;
}

export const GRADES: Record<Weather, Grade> = {
  CLEAR: { exposure: 1.0, bloomK: 1, bloomThreshold: 0.9, saturation: 1.05, tint: [1, 1, 1], glowK: 1, spotK: 1, spotAngle: 0.5 },
  RAIN: { exposure: 0.9, bloomK: 0.7, bloomThreshold: 1.05, saturation: 0.86, tint: [0.96, 1, 1.05], glowK: 0.55, spotK: 0.65, spotAngle: 0.4 },
  SNOW: { exposure: 0.76, bloomK: 0.5, bloomThreshold: 1.2, saturation: 0.74, tint: [0.94, 1, 1.1], glowK: 0.4, spotK: 0.45, spotAngle: 0.36 },
};

/** The grade currently in force (read each frame by the systems that depend on it). */
export const grade: Grade = { ...GRADES.CLEAR };

export function setGrade(w: Weather): Grade {
  Object.assign(grade, GRADES[w]);
  return grade;
}
