import { chapter3Complete, chapter4Complete, chapter5Complete, type CareerState } from '../core/career';
import type { StoryEvent } from '../data/story';

/** What follows the last event of Chapter 3, 4 or 5 (shown once): the flag that remembers it, the ending cutscene (it follows the Chapter 3 choice) and the ending card. */
export function chapterEnd(ev: StoryEvent, c: CareerState): { flag: string; cut?: string; chapter: number } | null {
  const pick = c.flags.deal ? 'deal' : 'public';
  if (ev.chapter === 3 && chapter3Complete(c) && !c.flags.c3Seen) return { flag: 'c3Seen', cut: `ch3-end-${pick}`, chapter: 3 };
  if (ev.chapter === 4 && chapter4Complete(c) && !c.flags.c4Seen) return { flag: 'c4Seen', chapter: 4 };
  if (ev.chapter === 5 && chapter5Complete(c) && !c.flags.c5Seen) return { flag: 'c5Seen', cut: `ch5-end-${pick}`, chapter: 5 };
  return null;
}
