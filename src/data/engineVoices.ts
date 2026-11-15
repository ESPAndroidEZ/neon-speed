/**
 * Procedural engine voices, one per car (same order as CARS). Pure data: audio/engineDsp turns a spec into sound,
 * so a new character is a new row, not a code branch. The turbo whistle, blow-off and flutter are NOT here
 * (audio/turboSound, LOCKED); these specs only shape the engine itself.
 */
export interface EngineVoiceSpec {
  id: string;
  /** Firings per crank revolution: 2 for a four or a two-rotor, 3 for a six. */
  per: number;
  /** Harmonic roll-off (amplitude = exp(-decay * k)) at light and at full load: small = bright and buzzy. */
  decay: [number, number];
  /** Gain of the even harmonics against the odd ones (below 1 = hollow, above 1 = edgy). */
  even: number;
  /** Harmonic number that gets a boost and how much (the "bark" or drone of the engine). */
  bump: [number, number];
  /** Half-order lumpiness in the wavetable (uneven cylinders). */
  lump: number;
  /** Idle roughness: random firing-frequency wobble that fades out by 2600 rpm. */
  idle: number;
  /** Exhaust resonances in Hz and their gains. */
  formant: [number, number, number];
  fgain: [number, number, number];
  /** Intake roar level and how high its band sweeps at redline (0.04 + this). */
  roar: number;
  roarHz: number;
  /** Mechanical whine: crank order and level (valvetrain, gears, rotary buzz). */
  whine: [number, number];
  /** Crossover rpm and extra brightness above it (VTEC-style or intake howl). 0 amount = none. */
  vtec: [number, number];
  /** Diesel clatter level (a noise tick on every firing, fading with rpm). */
  clatter: number;
  /** Rev limiter: stutter rate in Hz and the level left while cut (0.04 hard, 0.3 soft). */
  cut: [number, number];
  /** Multiplier on overrun pops and crackle. */
  pop: number;
  /** Saturation (grit). */
  drive: number;
}

export const ENGINE_VOICES: readonly EngineVoiceSpec[] = [
  { id: 'civic', per: 2, decay: [0.5, 0.2], even: 1.1, bump: [4, 0.35], lump: 0.08, idle: 0.025, formant: [160, 540, 1550], fgain: [0.6, 0.7, 0.85], roar: 0.8, roarHz: 0.3, whine: [8, 0.22], vtec: [5600, 0.55], clatter: 0, cut: [22, 0.04], pop: 0.5, drive: 1.0 },
  { id: 'golf', per: 2, decay: [0.75, 0.42], even: 0.95, bump: [2, 0.5], lump: 0.15, idle: 0.03, formant: [115, 360, 880], fgain: [1.0, 0.6, 0.25], roar: 0.7, roarHz: 0.14, whine: [0, 0], vtec: [0, 0], clatter: 0, cut: [14, 0.14], pop: 0.6, drive: 0.95 },
  { id: '350z', per: 3, decay: [0.62, 0.32], even: 0.8, bump: [3, 0.55], lump: 0.2, idle: 0.04, formant: [100, 300, 700], fgain: [1.15, 0.95, 0.5], roar: 1.0, roarHz: 0.16, whine: [0, 0], vtec: [0, 0], clatter: 0, cut: [16, 0.08], pop: 1.4, drive: 1.25 },
  { id: 'rx7', per: 2, decay: [0.15, 0.07], even: 1.0, bump: [6, 0.3], lump: 0.0, idle: 0.006, formant: [320, 1100, 2600], fgain: [0.4, 0.8, 1.05], roar: 0.35, roarHz: 0.32, whine: [20, 0.38], vtec: [0, 0], clatter: 0, cut: [26, 0.05], pop: 0.8, drive: 1.0 },
  { id: 'e61', per: 3, decay: [0.8, 0.6], even: 1.0, bump: [1, 0.6], lump: 0.25, idle: 0.055, formant: [85, 250, 580], fgain: [1.25, 0.8, 0.15], roar: 0.45, roarHz: 0.08, whine: [0, 0], vtec: [0, 0], clatter: 0.6, cut: [9, 0.3], pop: 0.0, drive: 1.3 },
  { id: 'm3', per: 3, decay: [0.38, 0.14], even: 1.0, bump: [6, 0.5], lump: 0.03, idle: 0.012, formant: [135, 560, 1800], fgain: [0.65, 0.9, 1.05], roar: 1.1, roarHz: 0.3, whine: [12, 0.18], vtec: [5000, 0.35], clatter: 0, cut: [20, 0.04], pop: 0.4, drive: 1.0 },
  { id: 'evo', per: 2, decay: [0.5, 0.36], even: 1.25, bump: [3, 0.6], lump: 0.32, idle: 0.07, formant: [140, 450, 1320], fgain: [0.9, 1.0, 0.9], roar: 0.9, roarHz: 0.24, whine: [0, 0], vtec: [0, 0], clatter: 0, cut: [18, 0.04], pop: 2.0, drive: 1.5 },
  { id: 'supra', per: 3, decay: [0.58, 0.3], even: 0.9, bump: [3, 0.3], lump: 0.05, idle: 0.015, formant: [100, 300, 820], fgain: [1.2, 0.9, 0.4], roar: 0.6, roarHz: 0.14, whine: [0, 0], vtec: [0, 0], clatter: 0, cut: [14, 0.1], pop: 0.9, drive: 1.1 },
];

const INDEX: Record<string, number> = {};
ENGINE_VOICES.forEach((v, i) => { INDEX[v.id] = i; });

/** Index of a car's voice (0 when unknown). A plain lookup: safe to call every frame. */
export const voiceIndex = (carId: string): number => INDEX[carId] ?? 0;
