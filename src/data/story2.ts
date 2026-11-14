import { EVENTS, type StoryEvent } from './story';
import { EVENTS_2A } from './story2a';
import { EVENTS_2B } from './story2b';

export const CHAPTER_2 = { id: 2, title: 'Redline Rising', tagline: 'Four districts. Four votes. One street.' };

/** The two chapters in play order: the career walks this list. */
export const ALL_EVENTS: readonly StoryEvent[] = [...EVENTS, ...EVENTS_2A, ...EVENTS_2B];

export const eventsOf = (chapter: number): StoryEvent[] => ALL_EVENTS.filter((e) => (e.chapter ?? 1) === chapter);

/** Epilogue card after the last event of Chapter 2: it follows the branching choice. */
export const EPILOGUE: Record<'open' | 'sponsor', { title: string; text: string }> = {
  open: { title: 'The Open Loop', text: 'No sponsors, no door fees, no rules except the Wall. Cain waits at the lighthouse. Chapter 3 is coming.' },
  sponsor: { title: 'Redline Racing', text: 'A season, a livery and a signature. Dante smiles for the cameras. Cain waits at the lighthouse. Chapter 3 is coming.' },
};

export const findAnyEvent = (id: string): StoryEvent => ALL_EVENTS.find((e) => e.id === id) ?? ALL_EVENTS[0];
