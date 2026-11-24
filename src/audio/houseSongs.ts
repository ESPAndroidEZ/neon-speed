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
  { // Bbm9 Gbmaj9 Ebm9 Fsus, slow and deep, soft keys
    name: 'Glass Tower', bpm: 112, swing: 0.14, kickHz: 45, stabWave: 'triangle',
    prog: [{ root: 34, voicing: [61, 65, 68, 72] }, { root: 30, voicing: [58, 61, 65, 68] }, { root: 39, voicing: [54, 58, 61, 65] }, { root: 29, voicing: [58, 60, 63, 65] }],
    bass: [[2, 0, 2], [6, 0, 1], [7, 7, 1], [10, 0, 2], [14, 12, 1]],
    stab: [3, 11], stabOdd: [7],
    pluck: [70, _, _, 73, _, _, 75, _, _, _, 77, _, _, _, 75, _, 73, _, _, _, 70, _, _, 68, _, _, 70, _, _, _, _, _],
  },
  { // Gm9 Ebmaj9 Bbmaj9 Fsus, straight and driving
    name: 'Afterglow', bpm: 126, swing: 0.08, kickHz: 50, stabWave: 'sawtooth',
    prog: [{ root: 31, voicing: [58, 62, 65, 69] }, { root: 39, voicing: [55, 58, 62, 65] }, { root: 34, voicing: [62, 65, 69, 72] }, { root: 29, voicing: [58, 60, 65, 67] }],
    bass: [[2, 0, 1], [3, 0, 1], [6, 12, 1], [10, 0, 1], [11, 7, 1], [14, 0, 2]],
    stab: [2, 10], stabOdd: [6, 14],
    pluck: [79, _, 82, _, 81, _, _, 77, _, _, 74, _, _, _, _, _, 77, _, 79, _, _, _, 74, _, 77, _, _, _, 70, _, _, _],
  },
  { // Em9 Cmaj9 Am11 Bm7, lazy swing, organ
    name: 'Velvet Underpass', bpm: 116, swing: 0.22, kickHz: 43, stabWave: 'square',
    prog: [{ root: 28, voicing: [55, 59, 62, 66] }, { root: 36, voicing: [52, 55, 59, 62] }, { root: 33, voicing: [60, 62, 64, 67] }, { root: 35, voicing: [54, 57, 59, 62] }],
    bass: [[3, 0, 1], [6, 0, 2], [9, 12, 1], [10, 0, 1], [14, 7, 2]],
    stab: [6, 14], stabOdd: [3],
    pluck: [_, _, 76, _, _, 79, _, 81, _, _, _, _, 83, _, 81, _, _, _, 79, _, _, _, 76, _, _, _, 74, _, 76, _, _, _],
  },
  { // Cm11 Abmaj7 Fm9 Gsus, fast peak-time
    name: 'Last Exit', bpm: 128, swing: 0.06, kickHz: 49, stabWave: 'sawtooth',
    prog: [{ root: 36, voicing: [58, 63, 65, 67] }, { root: 32, voicing: [60, 63, 67, 68] }, { root: 29, voicing: [56, 60, 63, 67] }, { root: 31, voicing: [60, 62, 65, 67] }],
    bass: [[2, 0, 1], [6, 0, 1], [7, 12, 1], [10, 0, 1], [14, 0, 1], [15, 12, 1]],
    stab: [3, 7, 11], stabOdd: [],
    pluck: [84, _, _, 82, _, _, 79, _, _, _, 75, _, 77, _, _, _, 79, _, _, 82, _, _, 84, _, _, _, 87, _, 84, _, _, _],
  },
  { // Gm9 Cm9 Ebmaj9 Dsus, soft keys over the water
    name: 'Marina Haze', bpm: 119, swing: 0.15, kickHz: 45, stabWave: 'triangle',
    prog: [{ root: 31, voicing: [58, 62, 65, 69] }, { root: 36, voicing: [58, 62, 63, 67] }, { root: 39, voicing: [55, 58, 62, 65] }, { root: 38, voicing: [55, 57, 60, 64] }],
    bass: [[2, 0, 2], [6, 0, 1], [7, 7, 1], [10, 0, 2], [14, 12, 1]],
    stab: [3, 10], stabOdd: [7],
    pluck: [74, _, _, 77, _, _, 79, _, _, _, 77, _, 74, _, 72, _, _, _, 70, _, _, 72, _, _, 74, _, _, _, _, _, 67, _],
  },
  { // Am9 Dm9 Gmaj7 Cmaj9, slow and dreamy
    name: 'Neon Lullaby', bpm: 114, swing: 0.2, kickHz: 43, stabWave: 'triangle',
    prog: [{ root: 33, voicing: [60, 64, 67, 71] }, { root: 38, voicing: [53, 57, 60, 64] }, { root: 31, voicing: [59, 62, 66, 69] }, { root: 36, voicing: [55, 59, 62, 64] }],
    bass: [[3, 0, 1], [6, 0, 2], [10, 12, 1], [11, 0, 1], [14, 7, 2]],
    stab: [6, 14], stabOdd: [3],
    pluck: [72, _, _, _, 76, _, _, 79, _, _, _, _, 76, _, 74, _, 72, _, _, _, _, 71, _, _, 69, _, _, 71, _, _, _, _],
  },
  { // Dm7 Bbmaj9 Fmaj9 Csus, warm and rolling
    name: 'Concrete Bloom', bpm: 121, swing: 0.12, kickHz: 47, stabWave: 'sawtooth',
    prog: [{ root: 38, voicing: [53, 57, 60, 64] }, { root: 34, voicing: [62, 65, 69, 72] }, { root: 29, voicing: [57, 60, 64, 67] }, { root: 36, voicing: [55, 60, 62, 65] }],
    bass: [[2, 0, 1], [3, 0, 1], [6, 12, 1], [10, 0, 2], [14, 7, 1]],
    stab: [2, 6, 11], stabOdd: [14],
    pluck: [77, _, _, _, 74, _, _, 72, _, _, _, _, 69, _, _, _, 74, _, _, 77, _, _, 81, _, _, _, 79, _, _, _, _, _],
  },
  { // Em9 Am9 Cmaj7 B7sus, bright and moving
    name: 'Satellite', bpm: 125, swing: 0.1, kickHz: 50, stabWave: 'sawtooth',
    prog: [{ root: 28, voicing: [55, 59, 62, 66] }, { root: 33, voicing: [60, 64, 67, 71] }, { root: 36, voicing: [52, 55, 59, 62] }, { root: 35, voicing: [52, 54, 57, 61] }],
    bass: [[2, 0, 2], [6, 0, 1], [7, 12, 1], [10, 0, 1], [11, 7, 1], [14, 0, 2]],
    stab: [3, 7, 11], stabOdd: [],
    pluck: [79, _, 76, _, _, 74, _, _, 76, _, _, _, 71, _, _, _, 74, _, _, 76, _, _, 79, _, 83, _, _, _, 81, _, _, _],
  },
  { // F#m9 Bmaj7 Emaj9 C#sus, organ in the rain
    name: 'Rooftop Rain', bpm: 117, swing: 0.17, kickHz: 44, stabWave: 'square',
    prog: [{ root: 30, voicing: [57, 61, 64, 68] }, { root: 35, voicing: [51, 54, 58, 61] }, { root: 28, voicing: [56, 59, 63, 66] }, { root: 37, voicing: [54, 56, 59, 63] }],
    bass: [[3, 0, 1], [6, 0, 2], [9, 12, 1], [10, 0, 1], [14, 7, 2]],
    stab: [6, 10], stabOdd: [3, 14],
    pluck: [73, _, _, 76, _, _, 80, _, _, _, 78, _, _, _, 76, _, 73, _, _, _, 71, _, _, 73, _, _, 76, _, _, _, 68, _],
  },
  { // Bm9 Gmaj9 Dmaj9 Asus, fast and clean
    name: 'City Limits', bpm: 127, swing: 0.07, kickHz: 51, stabWave: 'sawtooth',
    prog: [{ root: 35, voicing: [62, 66, 69, 73] }, { root: 31, voicing: [59, 62, 66, 69] }, { root: 38, voicing: [54, 57, 61, 64] }, { root: 33, voicing: [55, 57, 62, 64] }],
    bass: [[2, 0, 1], [6, 0, 1], [7, 12, 1], [10, 0, 1], [11, 7, 1], [14, 0, 2]],
    stab: [3, 7, 11], stabOdd: [],
    pluck: [78, _, _, 81, _, _, 85, _, _, 83, _, _, 81, _, _, _, 78, _, _, _, 74, _, _, 76, _, _, 78, _, 81, _, _, _],
  },
];
