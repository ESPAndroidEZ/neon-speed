/** Live-tunable audio values (K panel). Defaults are deliberately strong so the turbo and engine are obvious. */
export const AUDIO = {
  engineVolume: 1.15,
  /** Engine voicing preset: 0 smooth, 1 raspy, 2 aggressive. */
  engineVoicing: 1,
  /** Tyre squeal preset: 0 soft, 1 sharp. */
  squealVoicing: 0,
  ambienceVolume: 1.0,
  crashVolume: 1.0,
  /** Multiplies the music setting (2.4: at the default 0.75 the music is as loud as the engine used to be). */
  musicVolume: 2.4,
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

/** Engine sound source (Settings > Engine sound): the recorded loops (data/engineSounds) when a car has them, or always the synth. */
export const ENGINE_SOURCE = { samples: true };

/** Background music (Settings > Music style): deep house or synthwave. Bump `skip` to jump to the next house song; `song` = now playing. */
export const MUSIC_SOURCE: { style: 'house' | 'synth'; skip: number; song: string } = { style: 'house', skip: 0, song: '' };

/**
 * Settings > Sound mix presets (engine and music slider values). Measured in a race (tests/lab/bus-levels.mjs): with
 * 'engine' the engine bus is about 13.6 dB above the music; 'music' (default since 2026-11-17) swaps the two levels.
 */
export type SoundMix = 'music' | 'engine';
export const MIX_PRESETS: Record<SoundMix, { engine: number; music: number }> = {
  music: { engine: 0.15, music: 0.75 },
  engine: { engine: 0.6, music: 0.15 },
};
