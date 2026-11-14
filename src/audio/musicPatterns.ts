/** Pure note logic for the generative synthwave track (no Web Audio), so it can be unit tested. */
export const BPM = 108;
export const STEPS_PER_BAR = 16;
export const SECONDS_PER_STEP = 60 / BPM / 4;

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Am - F - C - G, one bar each: [root midi (low), third offset]. */
const CHORDS: readonly (readonly [number, number])[] = [
  [33, 3], [29, 4], [36, 4], [31, 4],
];

const bar = (step: number): number => Math.floor(step / STEPS_PER_BAR) % CHORDS.length;
const pos = (step: number): number => step % STEPS_PER_BAR;

/** Chord tones (low root, third, fifth) as midi numbers for the bar containing `step`. */
export function chordTones(step: number, octave = 0): [number, number, number] {
  const [r, third] = CHORDS[bar(step)];
  return [r + octave * 12, r + third + octave * 12, r + 7 + octave * 12];
}

/** Bass: driving 8ths on the root, octave pop on the off-beat. null = rest. */
export function bassNote(step: number): number | null {
  const p = pos(step);
  if (p % 2 !== 0) return null;
  const root = CHORDS[bar(step)][0];
  return p % 4 === 2 ? root + 12 : root;
}

/** Arpeggio over the chord in the octave above middle, 16th notes. */
export function arpNote(step: number): number {
  const t = chordTones(step, 3);
  const seq = [0, 1, 2, 1, 2, 1, 0, 2];
  return t[seq[pos(step) % 8]] + 12;
}

/** Lead: a simple hook in the pentatonic scale, 8th-note grid, rests on some steps. */
export function leadNote(step: number): number | null {
  const p = pos(step);
  const root = CHORDS[bar(step)][0] + 36;
  const hook: readonly (number | null)[] = [0, null, null, 7, null, 12, null, 10];
  const n = hook[(p / 2) % 8 | 0];
  return p % 2 === 0 && n !== null ? root + n : null;
}

export interface DrumHit {
  kick: boolean;
  snare: boolean;
  hat: boolean;
  openHat: boolean;
}

export function drumHit(step: number): DrumHit {
  const p = pos(step);
  return { kick: p % 4 === 0, snare: p === 4 || p === 12, hat: p % 2 === 0, openHat: p % 4 === 2 };
}

export interface Layers {
  kick: boolean;
  hats: boolean;
  snare: boolean;
  arp: boolean;
  lead: boolean;
  /** Filter cutoff for bass and pad (Hz). */
  cutoff: number;
}

/** Which parts play at a given intensity (0 = parked, 1 = flat out). Layers only ever get added as it rises. */
export function layers(intensity: number): Layers {
  const i = Math.min(1, Math.max(0, intensity));
  return { kick: i > 0.15, hats: i > 0.3, snare: i > 0.45, arp: i > 0.55, lead: i > 0.75, cutoff: 500 + i * 3500 };
}
