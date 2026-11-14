/** Live-tunable audio values (K panel). Defaults are deliberately strong so the turbo and engine are obvious. */
export const AUDIO = {
  engineVolume: 1.15,
  turboVolume: 1.4,
  /** Multiplies the whistle frequency. */
  whistlePitch: 1.0,
  /** Multiplies the blow-off valve length. */
  bovLength: 1.0,
  clunkVolume: 1.0,
  popVolume: 1.0,
  tyreVolume: 1.0,
  rivalVolume: 1.0,
};

export type AudioParams = typeof AUDIO;
