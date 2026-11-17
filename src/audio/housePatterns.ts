/** Pure note logic for the generative deep house songs (no Web Audio), so it can be unit tested. `step` counts 16ths from the song start. */
import type { HouseSong } from './houseSongs';

export const HOUSE_STEPS = 16;
/** Bars per song before the next one starts (about 1.5 minutes). */
export const SONG_BARS = 48;

export const stepSeconds = (song: HouseSong): number => 60 / song.bpm / 4;

const barOf = (song: HouseSong, step: number): number => Math.floor(step / HOUSE_STEPS) % song.prog.length;
const posOf = (step: number): number => step % HOUSE_STEPS;

/** Seconds a step starts late because of the swing. */
export const swingOffset = (song: HouseSong, step: number): number => (step % 2 === 1 ? song.swing * stepSeconds(song) : 0);

/** Arrangement: 2-bar intro without drums, a 4-bar breakdown in the middle, the full groove otherwise. */
export function houseSection(step: number): 'intro' | 'break' | 'full' {
  const b = Math.floor(step / HOUSE_STEPS) % SONG_BARS;
  return b < 2 ? 'intro' : b >= 24 && b < 28 ? 'break' : 'full';
}

/** Pad chord for the bar (played on its first step). */
export function houseChord(song: HouseSong, step: number): readonly number[] {
  return song.prog[barOf(song, step)].voicing;
}

/** Bass: off-beat, syncopated, out of the kick's way. [midi, length in steps] or null. */
export function houseBass(song: HouseSong, step: number): readonly [number, number] | null {
  const p = posOf(step);
  for (const [at, iv, len] of song.bass) if (at === p) return [song.prog[barOf(song, step)].root + iv, len];
  return null;
}

/** Chord stab on this step? */
export function houseStab(song: HouseSong, step: number): boolean {
  const p = posOf(step);
  return song.stab.includes(p) || (Math.floor(step / HOUSE_STEPS) % 2 === 1 && song.stabOdd.includes(p));
}

export function housePluck(song: HouseSong, step: number): number | null {
  return song.pluck[step % song.pluck.length];
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
  const sec = houseSection(step);
  const on = sec === 'full';
  return {
    kick: on && p % 4 === 0,
    clap: on && (p === 4 || p === 12),
    openHat: sec !== 'intro' && p % 4 === 2,
    hat: !on || p % 4 === 2 ? 0 : p % 2 === 1 ? 0.55 : 0.3,
    shaker: on && p % 2 === 1,
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
