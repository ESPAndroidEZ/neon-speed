/** The deep house songs (pure data). Each bar of `prog` is one chord; patterns loop over 16 steps per bar. */
export interface HouseSong {
  name: string;
  bpm: number;
  /** Late shift of every odd 16th, as a fraction of a step. */
  swing: number;
  /** One chord per bar: bass root (midi) and a rootless voicing in the middle register. */
  prog: readonly { root: number; voicing: readonly number[] }[];
  /** Bass hits: [step in bar, interval above the root, length in steps]. Never on a kick step (0, 4, 8, 12). */
  bass: readonly (readonly [number, number, number])[];
  /** Chord stab steps in every bar, plus extra ones in every second bar. */
  stab: readonly number[];
  stabOdd: readonly number[];
  /** Stab colour: sawtooth = classic filtered stab, square = organ, triangle = soft keys. */
  stabWave: OscillatorType;
  /** Top-line pluck over 32 steps (2 bars), null = rest. */
  pluck: readonly (number | null)[];
  /** Kick pitch (Hz at the end of the sweep): lower = deeper. */
  kickHz: number;
}

const _ = null;

export const HOUSE_SONGS: readonly HouseSong[] = [
  { // Am9 Fmaj9 Dm9 Em7
    name: 'Night Drive', bpm: 122, swing: 0.16, kickHz: 46, stabWave: 'sawtooth',
    prog: [{ root: 33, voicing: [60, 64, 67, 71] }, { root: 29, voicing: [57, 60, 64, 67] }, { root: 38, voicing: [53, 57, 60, 64] }, { root: 28, voicing: [55, 59, 62, 64] }],
    bass: [[2, 0, 2], [6, 0, 1], [7, 12, 1], [10, 0, 2], [13, 7, 1], [14, 0, 2]],
    stab: [3, 10], stabOdd: [14],
    pluck: [76, _, _, 79, _, _, 81, _, _, _, 79, _, 76, _, 74, _, _, _, 72, _, _, 74, _, _, 76, _, _, _, _, _, 69, _],
  },
  { // Fm9 Dbmaj7 Ebsus Cm7, organ stabs
    name: 'Harbour Lights', bpm: 120, swing: 0.12, kickHz: 44, stabWave: 'square',
    prog: [{ root: 29, voicing: [56, 60, 63, 67] }, { root: 37, voicing: [56, 60, 61, 65] }, { root: 39, voicing: [58, 61, 63, 68] }, { root: 36, voicing: [58, 60, 63, 67] }],
    bass: [[3, 0, 1], [6, 0, 2], [10, 0, 1], [11, 12, 1], [14, 0, 2]],
    stab: [2, 6, 11], stabOdd: [],
    pluck: [_, _, 77, _, _, 80, _, _, 82, _, _, _, 80, _, _, _, 84, _, _, 82, _, _, 80, _, 77, _, _, _, 75, _, _, _],
  },
  { // Dm9 Gm9 Bbmaj9 A7sus, soulful keys
    name: 'Low Tide', bpm: 124, swing: 0.18, kickHz: 48, stabWave: 'triangle',
    prog: [{ root: 38, voicing: [53, 57, 60, 64] }, { root: 31, voicing: [58, 62, 65, 69] }, { root: 34, voicing: [57, 60, 62, 65] }, { root: 33, voicing: [55, 57, 62, 64] }],
    bass: [[2, 0, 1], [3, 12, 1], [6, 0, 2], [10, 7, 1], [11, 0, 1], [14, 12, 2]],
    stab: [3, 6, 10, 13], stabOdd: [],
    pluck: [74, _, 77, _, _, _, 79, _, 81, _, _, _, _, _, 79, _, 77, _, _, _, 74, _, _, _, 72, _, 69, _, _, _, _, _],
  },
  { // Cm9 vamp into Fm9, minimal and dark
    name: 'Chrome Rain', bpm: 123, swing: 0.1, kickHz: 42, stabWave: 'sawtooth',
    prog: [{ root: 36, voicing: [51, 55, 58, 62] }, { root: 36, voicing: [51, 55, 58, 62] }, { root: 29, voicing: [56, 60, 63, 67] }, { root: 29, voicing: [56, 60, 63, 67] }],
    bass: [[2, 0, 1], [5, 0, 1], [6, 12, 1], [10, 0, 1], [13, 0, 1], [14, 10, 2]],
    stab: [6], stabOdd: [3, 14],
    pluck: [_, _, _, _, 79, _, _, 77, _, _, 75, _, _, _, _, _, _, _, _, _, 72, _, _, 75, _, _, 77, _, _, _, 70, _],
  },
  { // Ebmaj9 Cm9 Abmaj9 Bb11, warm and bright
    name: 'Sunset Boulevard', bpm: 118, swing: 0.2, kickHz: 47, stabWave: 'triangle',
    prog: [{ root: 39, voicing: [55, 58, 62, 65] }, { root: 36, voicing: [51, 55, 58, 62] }, { root: 32, voicing: [55, 58, 60, 63] }, { root: 34, voicing: [56, 60, 63, 65] }],
    bass: [[2, 0, 2], [6, 7, 1], [7, 0, 1], [10, 0, 2], [14, 12, 1], [15, 7, 1]],
    stab: [3, 10], stabOdd: [6, 14],
    pluck: [79, _, _, 82, _, _, 84, _, 82, _, _, _, 79, _, 77, _, 75, _, _, 77, _, _, 79, _, _, _, 82, _, _, _, _, _],
  },
];
