/** Live-tunable audio values (K panel). Defaults are deliberately strong so the turbo and engine are obvious. */
export const AUDIO = {
  engineVolume: 1.15,
  /** Engine voicing preset: 0 smooth, 1 raspy, 2 aggressive. */
  engineVoicing: 1,
  /** Tyre squeal preset: 0 soft, 1 sharp. */
  squealVoicing: 0,
  ambienceVolume: 1.0,
  crashVolume: 1.0,
  /** Multiplies the music setting. */
  musicVolume: 0.7,
  turboVolume: 1.4,
  /** Multiplies the whistle frequency. */
  whistlePitch: 1.0,
  /** Multiplies the blow-off valve length. */
  bovLength: 1.0,
  clunkVolume: 1.0,
  popVolume: 1.0,
  tyreVolume: 0.75,
  rivalVolume: 1.0,
};

export type AudioParams = typeof AUDIO;

/** Screens and speech tell the music what to do without the music knowing about them. */
export const MUSIC_CUE: { mood: 'garage' | null; speech: number } = { mood: null, speech: 0 };
