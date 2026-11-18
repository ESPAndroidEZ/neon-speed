import type { Weather } from '../types/game';
import { EVENTS } from './story1';

export { EVENTS };

export type Speaker = 'switch' | 'mara' | 'dante' | 'rookie' | 'vex' | 'jinx' | 'tank' | 'cain' | 'narrator' | 'nova' | 'brick' | 'calloway' | 'pixel' | 'lola' | 'rook';

export type Mood = 'neutral' | 'smirk' | 'angry' | 'worried';

/** One of two answers in a branching line. `set` writes story flags, `rel` shifts relationship values, `reply` plays next. */
export interface ChoiceOption {
  label: string;
  set?: Record<string, boolean>;
  rel?: Record<string, number>;
  reply: Line[];
}

export interface Choice {
  prompt: string;
  options: [ChoiceOption, ChoiceOption];
}

export interface Line {
  who: Speaker;
  text: string;
  /** Shown as a phone call (Mara). */
  phone?: boolean;
  /** Face shown in the portrait (default neutral). */
  mood?: Mood;
  /** Only played when this story flag is set (`if`) or not set (`unless`). */
  if?: string;
  unless?: string;
  /** After this line the player picks one of two answers. */
  choice?: Choice;
}

export const SPEAKERS: Record<Speaker, { name: string; color: number }> = {
  switch: { name: 'DJ Switch', color: 0x18d8ff },
  mara: { name: 'Mara', color: 0xffb347 },
  dante: { name: 'Dante Voss', color: 0xff2a9d },
  rookie: { name: 'You', color: 0xe8e8ee },
  vex: { name: 'Vex', color: 0x7a2fd6 },
  jinx: { name: 'Jinx', color: 0x39ff88 },
  tank: { name: 'Tank', color: 0x8a8f99 },
  cain: { name: 'Cain Vega', color: 0xffd27d },
  narrator: { name: '', color: 0xffffff },
  nova: { name: 'Nova', color: 0xff4fa3 },
  brick: { name: 'Brick', color: 0xc77b1a },
  calloway: { name: 'Calloway', color: 0xdfe6f2 },
  pixel: { name: 'Pixel', color: 0x6cf2ff },
  lola: { name: 'Lola', color: 0xff7aa8 },
  rook: { name: 'Rook', color: 0x9aa4b2 },
};

export interface StoryEvent {
  id: string;
  /** Chapter number (1 when omitted). */
  chapter?: number;
  /** Map the event is driven on (Kestrel Bay when omitted). */
  trackId?: string;
  title: string;
  blurb: string;
  kind: 'race' | 'drift';
  weather: Weather;
  /** Mid-race weather switch: after `at` seconds of racing. */
  weatherChange?: { at: number; to: Weather };
  laps: number;
  /** Force this car (id) for the event; otherwise the player's selected car. */
  carId?: string;
  rivals: string[];
  skillScale: number;
  /** Races: best allowed finishing position. Drift: unused. */
  needPosition: number;
  /** Drift events: points to bank to pass. */
  driftTarget?: number;
  /** One-off cash bonus for passing the first time. */
  bonus: number;
  /** Cars given when the event is passed. */
  unlocks: string[];
  /** Switch's one-line intro card shown at the countdown. */
  card: string;
  before: Line[];
  afterWin: Line[];
  afterLose: Line[];
  /** More lines for repeated failures: attempt n plays `afterLose` (n = 0) then these in turn, then wraps. */
  loseAlt?: Line[][];
  /** In-race captions (seconds after the countdown starts). `if` / `unless` read story flags. */
  cues?: Cue[];
  /** A different field once a story flag is set (the Chapter 2 branch). */
  rivalsIf?: Record<string, string[]>;
}

export interface Cue {
  at: number;
  dur: number;
  text: string;
  kind: 'switch' | 'lower';
  if?: string;
  unless?: string;
}

export const OPENING_CAPTIONS: { at: number; dur: number; text: string; kind: 'switch' | 'lower' | 'title' }[] = [
  { at: 0.3, dur: 1.9, text: 'Kestrel Bay. Two a.m.', kind: 'switch' },
  { at: 2.4, dur: 1.8, text: "The rain doesn't wash anything clean here.", kind: 'switch' },
  { at: 4.2, dur: 4.2, text: "Honda Civic, “The Beater”", kind: 'lower' },
  { at: 4.4, dur: 2.0, text: 'Redline runs the Loop. Dante runs Redline.', kind: 'switch' },
  { at: 6.6, dur: 1.9, text: "And Mara's garage is three days from the bank.", kind: 'switch' },
  { at: 8.7, dur: 1.9, text: 'So tonight... you drive.', kind: 'switch' },
  { at: 9.4, dur: 2.1, text: "NEON SPEED", kind: 'title' },
];

export const CHAPTER = { id: 1, title: 'Wet Asphalt', tagline: 'Every street remembers who bled for it.' };

export const ENDING = { title: 'Chapter 2: Redline Rising', text: 'The garage is safe. A voice on the radio has a name. Dante has a key, and a lot of money. Chapter 2 is open in the Story menu.' };

export const findEvent = (id: string): StoryEvent => EVENTS.find((e) => e.id === id) ?? EVENTS[0];
