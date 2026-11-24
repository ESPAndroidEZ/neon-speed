import type { Engine } from '../core/engine';
import type { SaveStore } from '../core/save';
import type { Game } from './game';
import type { StoryController } from './story';
import { STORY_HOOK, whoAt } from './roamStory';
import { storyOffer } from '../ui/storyOffer';
import { placeOf } from '../data/world/storyPlaces';
import { findAnyEvent } from '../data/story2';
import { CREW } from '../data/lore';
import type { StoryPin } from '../core/storyPins';
import { t, tx } from '../i18n';

/** The first sentence of a bio: the one-line introduction shown the first time you meet someone. */
const firstSentence = (s: string): string => { const i = s.indexOf('. '); return i > 0 ? s.slice(0, i + 1) : s; };

/**
 * Story places in Free Drive, the launcher side (docs/nfs-vision.md, item 1): the offer card when the car stops in a
 * ring, and the start: the normal story event (dialogue, race, results), after which the story returns to the city.
 * One call from freeDriveSetup.
 */
export function installStoryPins(d: { engine: Engine; game: Game; store: SaveStore; story: StoryController; hideResults: () => void; enterRoam: () => void }): void {
  const { game, store } = d;
  let offered: StoryPin | null = null;

  const start = (pin: StoryPin): void => {
    offer.hide();
    offered = null;
    store.data.career.flags[`met-${whoAt(pin.event)}`] = true; // introduced: the next visit skips the introduction line
    store.commit();
    d.story.start(findAnyEvent(pin.event), () => { d.hideResults(); d.enterRoam(); });
  };
  const offer = storyOffer(() => { if (offered && game.state === 'FREEROAM' && !game.paused) start(offered); });

  STORY_HOOK.offer = (pin, state) => {
    offered = pin;
    if (!pin) { offer.hide(); return; }
    const ev = findAnyEvent(pin.event), who = whoAt(pin.event), c = CREW.find((x) => x.id === who);
    const first = !store.data.career.flags[`met-${who}`];
    offer.show({
      who, replay: state === 2, kicker: t('pin.kicker', { n: ev.chapter ?? 1 }), title: tx(ev.title),
      person: `${c?.name ?? ''} · ${tx(c?.role ?? '')} · ${tx(placeOf(pin.event)?.place ?? '')}`,
      intro: first && c ? `${t('pin.new')}: ${firstSentence(tx(c.bio))}` : '',
    });
  };
  d.engine.onFrame(() => { if (offer.shown && game.state !== 'FREEROAM') offer.hide(); }); // left Free Drive: hide the card
}
