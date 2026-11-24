import type { SaveStore } from '../core/save';
import type { StoryEvent } from '../data/story';
import { RECAPS } from '../data/recaps';
import type { TitleCards } from '../ui/titleCards';

/** "Previously..." cards before the first event of a season chapter: once per save, skippable; then `done`. */
export function playRecap(ev: StoryEvent, store: SaveStore, cards: TitleCards, done: () => void): void {
  const list = RECAPS[ev.id], flags = store.data.career.flags, key = `recap:${ev.id}`;
  if (!list || flags[key]) return done();
  flags[key] = true;
  store.commit();
  cards.play(list, done);
}
