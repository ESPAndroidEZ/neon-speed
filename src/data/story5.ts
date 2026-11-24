import type { StoryEvent } from './story';
import { KEY_BEFORE, KEY_WIN, KEY_LOSE, KEY_LOSE_2, KEY_LOSE_3, WREN_BEFORE, WREN_WIN, WREN_LOSE, WREN_LOSE_2, WREN_LOSE_3, COAST_BEFORE, COAST_WIN, COAST_LOSE, COAST_LOSE_2, COAST_LOSE_3, BRIDGE_BEFORE, BRIDGE_WIN, BRIDGE_LOSE, BRIDGE_LOSE_2, BRIDGE_LOSE_3, DAWN_BEFORE, DAWN_WIN, DAWN_LOSE, DAWN_LOSE_2, DAWN_LOSE_3 } from './storyLines5';

/** Chapter 5, "The Bay Bridge" (docs/story.md, Season 2 arc): opens after the Chapter 4 ending. Five events on five maps, one long night. */
export const CHAPTER_5 = { id: 5, title: "The Bay Bridge", tagline: "One bridge. One truth." };

export const EVENTS_5: StoryEvent[] = [
  {
    id: 'c5-key', cutBefore: 'ch5-open', chapter: 5, trackId: 'drift-ring', title: "The Archive Key", blurb: "The key hangs under the old drift ring's lamp. Slide the whole ring clean to drop it.",
    kind: 'drift', weather: 'CLEAR', laps: 3, rivals: [], skillScale: 1, needPosition: 1, driftTarget: 8000, bonus: 12000, unlocks: [],
    card: "Slide until the lamp drops.",
    before: KEY_BEFORE, afterWin: KEY_WIN, afterLose: KEY_LOSE, loseAlt: [KEY_LOSE_2, KEY_LOSE_3],
  },
  {
    id: 'c5-wren', chapter: 5, trackId: 'mountain', title: "Wren Rides Along", blurb: "A veteran in the passenger seat calls every corner of the Mountain Pass. Rain, top two.",
    kind: 'race', weather: 'RAIN', laps: 2, rivals: ['vex', 'jinx', 'tank'], skillScale: 1, needPosition: 2, bonus: 12000, unlocks: [],
    card: "Trust the voice.",
    cues: [
      { at: 6, dur: 3, text: "Wren: Brake before the first hairpin.", kind: 'lower' },
      { at: 15, dur: 3, text: "Wren: Left, then right. Stay on the crown.", kind: 'lower' },
      { at: 26, dur: 3, text: "Wren: Do not lift. The grip is there.", kind: 'lower' },
      { at: 38, dur: 3, text: "Wren: Late apex. Let the car breathe.", kind: 'lower' },
    ],
    before: WREN_BEFORE, afterWin: WREN_WIN, afterLose: WREN_LOSE, loseAlt: [WREN_LOSE_2, WREN_LOSE_3],
  },
  {
    id: 'c5-coast', chapter: 5, trackId: 'coast', title: "The Coast Keys", blurb: "Calloway holds the lighthouse keys and the coast road. Beat him fairly. Top two.",
    kind: 'race', weather: 'CLEAR', laps: 2, rivals: ['calloway', 'nova', 'rook'], rivalsIf: { public: ['calloway', 'nova', 'pixel'], deal: ['calloway', 'vex', 'dante'] }, skillScale: 1, needPosition: 2, bonus: 13000, unlocks: [],
    card: "The coast, the wind, the keys.",
    before: COAST_BEFORE, afterWin: COAST_WIN, afterLose: COAST_LOSE, loseAlt: [COAST_LOSE_2, COAST_LOSE_3],
  },
  {
    id: 'c5-bridge', chapter: 5, trackId: 'cliff', title: "The Bay Bridge", blurb: "Redline closes the bridge at midnight. Cross first. Rain turning to snow, top two.",
    kind: 'race', weather: 'RAIN', weatherChange: { at: 25, to: 'SNOW' }, laps: 1, rivals: ['rook', 'brick', 'lola'], skillScale: 1, needPosition: 2, bonus: 14000, unlocks: [],
    card: "One bridge. One chance.",
    before: BRIDGE_BEFORE, afterWin: BRIDGE_WIN, afterLose: BRIDGE_LOSE, loseAlt: [BRIDGE_LOSE_2, BRIDGE_LOSE_3],
  },
  {
    id: 'c5-dawn', cutBefore: 'ch5-final', chapter: 5, trackId: 'kestrel', title: "Dawn on the Loop", blurb: "The whole city on the Harbor Loop at dawn. Beat Dante and keep the Wall. You must win.",
    kind: 'race', weather: 'CLEAR', laps: 3, rivals: ['dante', 'calloway', 'pixel'], skillScale: 1, needPosition: 1, bonus: 30000, unlocks: [],
    card: "Win it for the street.",
    before: DAWN_BEFORE, afterWin: DAWN_WIN, afterLose: DAWN_LOSE, loseAlt: [DAWN_LOSE_2, DAWN_LOSE_3],
  },
];

/** End card after the last event of Chapter 5: follows the choice made at the end of Chapter 3 (`deal` = traded the evidence, otherwise public). */
export const EPILOGUE_5: Record<'public' | 'deal', { title: string; text: string; credits: string[] }> = {
  public: {
    title: "What the Street Remembers",
    text: "Dawn over the bridge. Wren gave a statement and went quiet. Mara repainted the Red Hand Wall with every hand that came. Cain signed off the radio himself: this street remembers who bled for it, and now it remembers you.",
    credits: ["NEON SPEED", "Every street remembers who bled for it.", "Free Drive stays open. Neon Harbor is yours."],
  },
  deal: {
    title: "What the Street Remembers",
    text: "Dawn over the bridge. The Wall wears black and gold, but the street still shows up, and Dante let the Loop run. Wren left a letter for Cain. Mara kept the keys. Some doors you choose twice, and this one stayed open.",
    credits: ["NEON SPEED", "Some doors you choose twice.", "Free Drive stays open. Neon Harbor is yours."],
  },
};
