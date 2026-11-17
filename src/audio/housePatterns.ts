/** Pure note logic for the generative deep house track (no Web Audio), so it can be unit tested. */
export const HOUSE_BPM = 122;
export const HOUSE_STEPS = 16;
export const HOUSE_STEP_S = 60 / HOUSE_BPM / 4;
/** Late shift of every odd 16th, as a fraction of a step (the shuffle). */
export const HOUSE_SWING = 0.16;

/** One bar each: bass root (midi) and a rootless voicing in the middle register. Am9, Fmaj9, Dm9, Em7. */
const PROG: readonly { root: number; voicing: readonly number[] }[] = [
  { root: 33, voicing: [60, 64, 67, 71] },
  { root: 29, voicing: [57, 60, 64, 67] },
  { root: 38, voicing: [53, 57, 60, 64] },
  { root: 28, voicing: [55, 59, 62, 64] },
];

const barOf = (step: number): number => Math.floor(step / HOUSE_STEPS) % PROG.length;
const posOf = (step: number): number => step % HOUSE_STEPS;

/** Seconds a step starts late because of the swing. */
export const swingOffset = (step: number): number => (step % 2 === 1 ? HOUSE_SWING * HOUSE_STEP_S : 0);

/** Pad chord for the bar (played on its first step). */
export function houseChord(step: number): readonly number[] {
  return PROG[barOf(step)].voicing;
}

/** Bass: off-beat, syncopated, out of the kick's way. [midi, length in steps] or null. */
const BASS: readonly (readonly [number, number, number])[] = [[2, 0, 2], [6, 0, 1], [7, 12, 1], [10, 0, 2], [13, 7, 1], [14, 0, 2]];
export function houseBass(step: number): readonly [number, number] | null {
  const p = posOf(step);
  for (const [at, iv, len] of BASS) if (at === p) return [PROG[barOf(step)].root + iv, len];
  return null;
}

/** Chord stab positions: a short filtered stab on the "and" of beats, extra push every second bar. */
export function houseStab(step: number): boolean {
  const p = posOf(step);
  return p === 3 || p === 10 || (barOf(step) % 2 === 1 && p === 14);
}

/** Sparse pluck motif over A minor pentatonic, 2-bar phrase. */
const PLUCK: readonly (number | null)[] = [76, null, null, 79, null, null, 81, null, null, null, 79, null, 76, null, 74, null,
  null, null, 72, null, null, 74, null, null, 76, null, null, null, null, null, 69, null];
export function housePluck(step: number): number | null {
  return PLUCK[step % PLUCK.length];
}

export interface HouseHit {
  kick: boolean;
  clap: boolean;
  openHat: boolean;
  /** Closed 16th hat velocity (0 = none). */
  hat: number;
  shaker: boolean;
}

export function houseDrums(step: number): HouseHit {
  const p = posOf(step);
  return {
    kick: p % 4 === 0,
    clap: p === 4 || p === 12,
    openHat: p % 4 === 2,
    hat: p % 4 === 2 ? 0 : p % 2 === 1 ? 0.55 : 0.3,
    shaker: p % 2 === 1,
  };
}

export interface HouseLayers {
  /** Kick, bass, pad, stabs and the off-beat hat always play: it is the groove under the menus too. */
  clap: boolean;
  shaker: boolean;
  hats: boolean;
  pluck: boolean;
  /** Stab filter cutoff (Hz): opens with speed. */
  cutoff: number;
}

/** Which parts play at a given intensity (0 = parked, 1 = flat out). Layers only ever get added as it rises. */
export function houseLayers(intensity: number): HouseLayers {
  const i = Math.min(1, Math.max(0, intensity));
  return { clap: i > 0.2, shaker: i > 0.35, hats: i > 0.5, pluck: i > 0.72, cutoff: 700 + i * 2600 };
}
