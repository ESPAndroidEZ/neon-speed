import { EVENTS, type StoryEvent } from '../data/story';
import type { SaveData } from './save';

/** Story progress, stored inside the save. Pure functions over SaveData so they can be tested without a browser. */
export interface CareerState {
  /** Event ids passed, in order. */
  completed: string[];
  seenIntro: boolean;
  endingSeen: boolean;
}

export const defaultCareer = (): CareerState => ({ completed: [], seenIntro: false, endingSeen: false });

/** The next event to play, or null when the chapter is complete. */
export function nextEvent(c: CareerState): StoryEvent | null {
  return EVENTS.find((e) => !c.completed.includes(e.id)) ?? null;
}

export const isDone = (c: CareerState): boolean => nextEvent(c) === null;

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
    return { passed: driftScore >= target, summary: `Drift score ${driftScore.toLocaleString()} / ${target.toLocaleString()}` };
  }
  return { passed: position <= ev.needPosition, summary: ev.needPosition === 1 ? `Win the race (you finished P${position})` : `Finish top ${ev.needPosition} (you finished P${position})` };
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
