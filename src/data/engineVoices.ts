/**
 * Engine voices for the procedural engine synth (audio/engineDsp). One profile per car, plus four generic layouts
 * for any car without its own. All numbers are tuned by ear; the synth reads them as plain data (they are shipped
 * into the AudioWorklet through processorOptions), so this file must stay JSON-like: numbers and arrays only.
 */
export interface EngineProfile {
  /** Firings per crank revolution: 2 for a four or a two-rotor rotary, 3 for a six. */
  per: number;
  /** Harmonic amplitudes (orders of the firing frequency) at light load and at full load. */
  lo: number[];
  hi: number[];
  /** Seed for the harmonic phases (changes the wave shape, not the spectrum). */
  phase: number;
  /** Half-order lump from uneven firing (0 = perfectly even, 0.3 = gruff V6 rasp). */
  sub: number;
  /** Exhaust resonances in Hz, their gains, and their sharpness. */
  formant: number[];
  fGain: number[];
  q: number;
  /** Intake roar level, and how much the firing pulses chop it (an induction honk). */
  roar: number;
  pulse: number;
  /** Diesel knock: a short noisy click on every firing, strongest at idle and low load. */
  clatter: number;
  /** Rpm of a cam switch-over (0 = none): above it the tone hardens and the intake howls. */
  cam: number;
  /** Idle irregularity (1 = normal, 2.5 = a rotary "brap"). */
  idle: number;
  /** Output darkening (0 = open pipe, 0.6 = turbo-muffled diesel). */
  dark: number;
  /** Level trim so every car sits at about the same loudness. */
  level: number;
}

const generic = (per: number, lo: number[], hi: number[], phase: number): EngineProfile => ({
  per, lo, hi, phase, sub: 0, formant: [140, 430, 1150], fGain: [0.95, 0.75, 0.5], q: 1, roar: 1, pulse: 0, clatter: 0, cam: 0, idle: 1, dark: 0, level: 1,
});

/** Index 0-3: generic layouts (i4, v6, i6, rotary); then one profile per car id, in VOICE_IDS order. */
export const ENGINE_VOICES: EngineProfile[] = [
  generic(2, [1, 0.5, 0.18, 0.1, 0.05, 0.03], [1, 0.7, 0.55, 0.4, 0.3, 0.22, 0.16, 0.12, 0.09, 0.07], 0.7),
  generic(3, [1, 0.35, 0.3, 0.12, 0.08, 0.04], [1, 0.6, 0.65, 0.45, 0.4, 0.28, 0.22, 0.17, 0.12, 0.1], 1.4),
  generic(3, [1, 0.3, 0.12, 0.2, 0.05, 0.08], [1, 0.5, 0.4, 0.5, 0.35, 0.38, 0.22, 0.25, 0.14, 0.15, 0.09, 0.1], 2.1),
  generic(2, [1, 0.6, 0.5, 0.42, 0.36, 0.3, 0.26, 0.22], [1, 0.9, 0.82, 0.75, 0.68, 0.6, 0.54, 0.48, 0.42, 0.37, 0.32, 0.28, 0.24, 0.2], 2.8),
  // civic: high-revving NA four, thin and bright, hardens and howls past the cam switch at 5800
  { per: 2, lo: [1, 0.45, 0.2, 0.12, 0.06, 0.04], hi: [1, 0.75, 0.6, 0.5, 0.42, 0.34, 0.26, 0.2, 0.15, 0.12], phase: 0.9, sub: 0.06, formant: [165, 540, 1550], fGain: [0.7, 0.75, 0.65], q: 1.1, roar: 0.9, pulse: 0.5, clatter: 0, cam: 5800, idle: 0.8, dark: 0.05, level: 1 },
  // golf: small turbo four, round and muffled, little drama
  { per: 2, lo: [1, 0.4, 0.15, 0.06, 0.03], hi: [1, 0.6, 0.4, 0.25, 0.16, 0.1, 0.06], phase: 0.5, sub: 0.08, formant: [120, 380, 900], fGain: [0.95, 0.6, 0.25], q: 1, roar: 0.5, pulse: 0.2, clatter: 0, cam: 0, idle: 0.7, dark: 0.45, level: 1 },
  // 350z: NA V6, gruff and raspy (strong uneven half order), brassy top end
  { per: 3, lo: [1, 0.4, 0.35, 0.15, 0.1, 0.05], hi: [1, 0.65, 0.75, 0.5, 0.48, 0.32, 0.28, 0.2, 0.16, 0.12], phase: 1.6, sub: 0.28, formant: [110, 360, 1350], fGain: [1, 0.9, 0.75], q: 1.5, roar: 0.7, pulse: 0.35, clatter: 0, cam: 0, idle: 1, dark: 0.15, level: 1 },
  // rx7: twin-rotor, dense buzzy harmonics, choppy brap at idle, screams up top
  { per: 2, lo: [1, 0.65, 0.55, 0.45, 0.4, 0.33, 0.28, 0.24], hi: [1, 0.9, 0.82, 0.75, 0.68, 0.6, 0.54, 0.48, 0.42, 0.37, 0.32, 0.28, 0.24, 0.2], phase: 2.8, sub: 0, formant: [190, 700, 2100], fGain: [0.8, 0.85, 0.8], q: 1.3, roar: 0.8, pulse: 0.6, clatter: 0, cam: 0, idle: 2.5, dark: 0.1, level: 1 },
  // e61: twin-turbo diesel six, deep and dark, clatters at idle, runs out of breath early
  { per: 3, lo: [1, 0.3, 0.1, 0.05], hi: [1, 0.45, 0.25, 0.15, 0.08, 0.05], phase: 1.1, sub: 0.05, formant: [90, 280, 700], fGain: [1, 0.6, 0.2], q: 1, roar: 0.35, pulse: 0.1, clatter: 1, cam: 0, idle: 0.5, dark: 0.6, level: 1 },
  // m3: NA straight six to 8000 with individual throttles: silky, loud intake honk, metallic howl
  { per: 3, lo: [1, 0.3, 0.15, 0.22, 0.06, 0.1], hi: [1, 0.5, 0.45, 0.6, 0.4, 0.48, 0.3, 0.34, 0.2, 0.22, 0.14, 0.15], phase: 2.1, sub: 0.03, formant: [150, 560, 1800], fGain: [0.75, 0.85, 0.85], q: 1.4, roar: 1.1, pulse: 0.8, clatter: 0, cam: 0, idle: 0.5, dark: 0.05, level: 1 },
  // evo: turbo four with a loud exhaust, lumpy and burbly
  { per: 2, lo: [1, 0.55, 0.22, 0.12, 0.06], hi: [1, 0.7, 0.5, 0.38, 0.26, 0.18, 0.12, 0.08], phase: 0.3, sub: 0.14, formant: [125, 470, 1200], fGain: [1, 0.85, 0.5], q: 1.35, roar: 0.65, pulse: 0.3, clatter: 0, cam: 0, idle: 1.3, dark: 0.3, level: 1 },
  // supra: twin-turbo straight six, smooth and deep, turbos round off the top
  { per: 3, lo: [1, 0.28, 0.12, 0.18, 0.05, 0.07], hi: [1, 0.5, 0.38, 0.45, 0.3, 0.32, 0.18, 0.2, 0.1, 0.1], phase: 1.9, sub: 0.04, formant: [115, 400, 1100], fGain: [1, 0.8, 0.45], q: 1.2, roar: 0.6, pulse: 0.3, clatter: 0, cam: 0, idle: 0.4, dark: 0.35, level: 1 },
];

/** Car ids with their own voice, in ENGINE_VOICES order after the four generic layouts. */
export const VOICE_IDS = ['civic', 'golf', '350z', 'rx7', 'e61', 'm3', 'evo', 'supra'];
const GENERIC = { i4: 0, v6: 1, i6: 2, rotary: 3 } as const;

/** Voice index for a car: its own profile when it has one, otherwise the generic one for its layout. */
export function engineVoiceIndex(carId: string, layout: keyof typeof GENERIC): number {
  const i = VOICE_IDS.indexOf(carId);
  return i >= 0 ? 4 + i : GENERIC[layout];
}
