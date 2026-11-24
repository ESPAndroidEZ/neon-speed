import type { DistrictId } from '../../types/world';

/**
 * Where each story event waits in Neon Harbor (docs/nfs-vision.md, item 1): drive into its ring to start it. `who`
 * overrides the person who greets you (default: the first speaker of the event's opening lines, see core/storyPins).
 * Place names are shown to the player and translated through tx().
 */
export interface StoryPlace { event: string; district: DistrictId; place: string; who?: string }

export const STORY_PLACES: readonly StoryPlace[] = [
  { event: 'warmup', district: 'oldtown', place: "Mara's Garage", who: 'mara' },
  { event: 'dock', district: 'harbour', place: 'Dock Gate' },
  { event: 'drift', district: 'industrial', place: 'Drift Pad' },
  { event: 'finale', district: 'downtown', place: 'Redline Tower', who: 'dante' },
  { event: 'c2-redline', district: 'downtown', place: 'The Roadblock', who: 'dante' },
  { event: 'c2-neon', district: 'strip', place: 'Neon Boulevard' },
  { event: 'c2-maze', district: 'harbour', place: 'Container Maze' },
  { event: 'c2-yard', district: 'industrial', place: 'Drift Yard' },
  { event: 'c2-cliff', district: 'hills', place: 'Cliffside Road' },
  { event: 'c2-final', district: 'oldtown', place: 'The Council Wall', who: 'dante' },
  { event: 'c3-lighthouse', district: 'harbour', place: 'The Lighthouse' },
  { event: 'c3-gear', district: 'strip', place: "Cain's Booth" },
  { event: 'c3-serpent', district: 'industrial', place: 'Gate House' },
  { event: 'c3-pass', district: 'hills', place: 'North Pass' },
  { event: 'c3-final', district: 'oldtown', place: 'The Wall', who: 'dante' },
  { event: 'c4-yard', district: 'harbour', place: "Pixel's Yard" },
  { event: 'c4-cranes', district: 'harbour', place: 'Crane Row' },
  { event: 'c4-cliff', district: 'hills', place: 'Cliff Lodge' },
  { event: 'c4-broker', district: 'strip', place: "Broker's Tower" },
  { event: 'c5-key', district: 'oldtown', place: 'The Old Archive' },
  { event: 'c5-wren', district: 'hills', place: 'Mountain Lookout', who: 'wren' },
  { event: 'c5-coast', district: 'industrial', place: 'Coast Gate' },
  { event: 'c5-bridge', district: 'harbour', place: 'Bay Bridge Approach' },
  { event: 'c5-dawn', district: 'downtown', place: 'Harbor Loop Start', who: 'dante' },
];

/** Every place name, for the Spanish check (tests/lab/i18n-harvest). */
export const STORY_PLACE_TEXT: string[] = STORY_PLACES.map((p) => p.place);

export const placeOf = (event: string): StoryPlace | undefined => STORY_PLACES.find((p) => p.event === event);
