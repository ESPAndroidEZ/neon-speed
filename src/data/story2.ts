import { EVENTS, type StoryEvent } from './story';
import { EVENTS_2A } from './story2a';
import { EVENTS_2B } from './story2b';
import { EVENTS_3 } from './story3';

export const CHAPTER_2 = { id: 2, title: 'Redline Rising', tagline: 'Four districts. Four votes. One street.' };

/** The two chapters in play order: the career walks this list. */
export const ALL_EVENTS: readonly StoryEvent[] = [...EVENTS, ...EVENTS_2A, ...EVENTS_2B];

/** Chapter 3 follows the Chapter 2 epilogue (career.nextEvent3); everything the saves and menus can refer to is here. */
export const EVERY_EVENT: readonly StoryEvent[] = [...ALL_EVENTS, ...EVENTS_3];

export const eventsOf = (chapter: number): StoryEvent[] => EVERY_EVENT.filter((e) => (e.chapter ?? 1) === chapter);

/** Epilogue card after the last event of Chapter 2: it follows the branching choice. `credits` roll under it. */
export const EPILOGUE: Record<'open' | 'sponsor', { title: string; text: string; credits: string[] }> = {
  open: {
    title: 'The Open Loop',
    text: 'Dante pressed his hand on the Wall beside Cain’s. Calloway’s father faces a judge. Mara answers when Cain calls. The Loop belongs to everyone who shows up.',
    credits: ['NEON SPEED', 'Kestrel Bay keeps the lights on.', 'Thanks for driving.'],
  },
  sponsor: {
    title: 'Redline Racing',
    text: 'A season, a livery and a Loop where nobody gets hurt. The brake line sleeps in a locked drawer. Cain still broadcasts. Mara still answers, slowly.',
    credits: ['NEON SPEED', 'Some doors you choose twice.', 'Thanks for driving.'],
  },
};

export const findAnyEvent = (id: string): StoryEvent => EVERY_EVENT.find((e) => e.id === id) ?? ALL_EVENTS[0];
