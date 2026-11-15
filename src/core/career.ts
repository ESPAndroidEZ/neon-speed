import { EVENTS, type ChoiceOption, type Line, type StoryEvent } from '../data/story';
import { ALL_EVENTS } from '../data/story2';
import type { SaveData } from './save';
import { t } from '../i18n';

/** Story progress, stored inside the save. Pure functions over SaveData so they can be tested without a browser. */
export interface CareerState {
  /** Event ids passed, in order. */
  completed: string[];
  seenIntro: boolean;
  endingSeen: boolean;
  /** Chapter 2 epilogue card seen. */
  epilogueSeen: boolean;
  /** Story flags set by dialogue choices (open, sponsor ...). */
  flags: Record<string, boolean>;
  /** Relationship values, -5..5, per character id (mara, cain, dante, nova, brick ...). */
  rel: Record<string, number>;
}

export const defaultCareer = (): CareerState => ({ completed: [], seenIntro: false, endingSeen: false, epilogueSeen: false, flags: {}, rel: {} });

/** The next event to play over both chapters, or null when the story is complete. */
export function nextEvent(c: CareerState): StoryEvent | null {
  return ALL_EVENTS.find((e) => !c.completed.includes(e.id)) ?? null;
}

/** Chapter 1 complete (its end card follows). */
export const isDone = (c: CareerState): boolean => EVENTS.every((e) => c.completed.includes(e.id));

/** Chapter 2 complete: the epilogue follows the flag the player chose. */
export const storyComplete = (c: CareerState): boolean => nextEvent(c) === null;

/** Drop the lines whose story flag condition is not met. */
export const playable = (lines: readonly Line[], c: CareerState): Line[] => lines.filter((l) => (!l.if || c.flags[l.if]) && (!l.unless || !c.flags[l.unless]));

export const clampRel = (v: number): number => Math.max(-5, Math.min(5, v));

/** Apply a dialogue choice: set its flags and shift relationship values. Returns the option's reply lines. */
export function applyChoice(c: CareerState, opt: ChoiceOption): ChoiceOption['reply'] {
  for (const [k, v] of Object.entries(opt.set ?? {})) c.flags[k] = v;
  for (const [k, v] of Object.entries(opt.rel ?? {})) c.rel[k] = clampRel((c.rel[k] ?? 0) + v);
  return opt.reply;
}

/** An event is playable if it is already passed (replay) or it is the next one. */
export const isUnlocked = (c: CareerState, id: string): boolean => c.completed.includes(id) || nextEvent(c)?.id === id;

export interface EventOutcome {
  passed: boolean;
  /** One line explaining the objective result. */
  summary: string;
}

/** Did the player meet the event's objective? */
export function evaluate(ev: StoryEvent, position: number, driftScore: number): EventOutcome {
  if (ev.kind === 'drift') {
    const target = ev.driftTarget ?? 0;
    return { passed: driftScore >= target, summary: t('career.drift', { score: driftScore.toLocaleString(), target: target.toLocaleString() }) };
  }
  return { passed: position <= ev.needPosition, summary: t(ev.needPosition === 1 ? 'career.win' : 'career.top', { n: ev.needPosition, p: position }) };
}

/**
 * Record a passed event: first pass grants the bonus and the unlocked cars. Returns what was newly given.
 * Replays of a completed event give nothing extra.
 */
export function completeEvent(save: SaveData, ev: StoryEvent): { firstTime: boolean; bonus: number; newCars: string[] } {
  const c = save.career;
  if (c.completed.includes(ev.id)) return { firstTime: false, bonus: 0, newCars: [] };
  c.completed.push(ev.id);
  save.cash += ev.bonus;
  const newCars = ev.unlocks.filter((id) => !save.owned.includes(id));
  for (const id of newCars) save.owned.push(id);
  return { firstTime: true, bonus: ev.bonus, newCars };
}

/** Cash for a drift event: scales with points instead of finishing position. */
export const driftCash = (score: number): number => Math.round(score / 3);
