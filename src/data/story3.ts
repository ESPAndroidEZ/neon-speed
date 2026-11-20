import type { StoryEvent } from './story';
import { LIGHTHOUSE_BEFORE, LIGHTHOUSE_WIN, LIGHTHOUSE_LOSE, LIGHTHOUSE_LOSE_2, LIGHTHOUSE_LOSE_3, GEAR_BEFORE, GEAR_WIN, GEAR_LOSE, GEAR_LOSE_2, GEAR_LOSE_3, SERPENT_BEFORE, SERPENT_WIN, SERPENT_LOSE, SERPENT_LOSE_2, SERPENT_LOSE_3, PASS_BEFORE, PASS_WIN, PASS_LOSE, PASS_LOSE_2, PASS_LOSE_3, FINAL_BEFORE, FINAL_WIN, FINAL_LOSE, FINAL_LOSE_2, FINAL_LOSE_3 } from './storyLines3';

/** Chapter 3, "Blood on the Wall" (docs/story.md): opens after the Chapter 2 epilogue. Dialogue in storyLines3.ts. */
export const CHAPTER_3 = { id: 3, title: "Blood on the Wall", tagline: "The truth is in the road." };

export const EVENTS_3: StoryEvent[] = [
  {
    id: 'c3-lighthouse', cutBefore: 'ch3-open', chapter: 3, trackId: 'coast', title: "The Lighthouse", blurb: "Cain shows you the cut brake line. Race the coast road with his voice in your ear. Top two.",
    kind: 'race', weather: 'CLEAR', laps: 1, rivals: ['rook', 'vex', 'jinx'], skillScale: 1, needPosition: 2, bonus: 8000, unlocks: [],
    card: "Twelve years, one brake line.",
    before: LIGHTHOUSE_BEFORE, afterWin: LIGHTHOUSE_WIN, afterLose: LIGHTHOUSE_LOSE, loseAlt: [LIGHTHOUSE_LOSE_2, LIGHTHOUSE_LOSE_3],
  },
  {
    id: 'c3-gear', chapter: 3, trackId: 'neon', title: "Cain's Gearbox", blurb: "Redline owns the lap sensors, so tonight you shift by hand. Manual gearbox only. Rain on the Neon Strip. Top two.",
    kind: 'race', weather: 'RAIN', laps: 3, rivals: ['vex', 'tank', 'pixel'], rivalsIf: { open: ['nova', 'brick', 'pixel'], sponsor: ['vex', 'tank', 'pixel'] }, manual: true, skillScale: 1, needPosition: 2, bonus: 9000, unlocks: [],
    card: "No computer. Just you and the lever.",
    before: GEAR_BEFORE, afterWin: GEAR_WIN, afterLose: GEAR_LOSE, loseAlt: [GEAR_LOSE_2, GEAR_LOSE_3],
  },
  {
    id: 'c3-serpent', chapter: 3, trackId: 'serpent-drift', title: "Night Shift", blurb: "Drive the gate guard's route sideways, no rivals: 7,000 drift points cut the city's cameras long enough to get inside.",
    kind: 'drift', weather: 'RAIN', laps: 3, rivals: [], skillScale: 1, needPosition: 99, driftTarget: 7000, bonus: 10000, unlocks: [],
    card: "Left, right, left. Stay sideways.",
    before: SERPENT_BEFORE, afterWin: SERPENT_WIN, afterLose: SERPENT_LOSE, loseAlt: [SERPENT_LOSE_2, SERPENT_LOSE_3],
  },
  {
    id: 'c3-pass', chapter: 3, trackId: 'mountain', title: "The North Pass", blurb: "Calloway guards the evidence and the mountain. Snow on the switchbacks. Top two.",
    kind: 'race', weather: 'SNOW', laps: 1, rivals: ['calloway', 'jinx', 'rook'], rivalsIf: { open: ['calloway', 'brick', 'rook'], sponsor: ['calloway', 'dante', 'rook'] }, skillScale: 1, needPosition: 2, bonus: 12000, unlocks: ['e61'],
    card: "The mountain keeps its secrets. Not tonight.",
    before: PASS_BEFORE, afterWin: PASS_WIN, afterLose: PASS_LOSE, loseAlt: [PASS_LOSE_2, PASS_LOSE_3],
  },
  {
    id: 'c3-final', cutBefore: 'ch3-final', chapter: 3, trackId: 'coast', title: "The Final Loop", blurb: "The truth is on the table and Dante wants the Wall. Rain turning to snow on the long coast run. You must win.",
    kind: 'race', weather: 'RAIN', weatherChange: { at: 70, to: 'SNOW' }, laps: 2, rivals: ['dante', 'calloway', 'jinx'], rivalsIf: { open: ['dante', 'calloway', 'nova'], sponsor: ['dante', 'calloway', 'vex'] }, skillScale: 1, needPosition: 1, bonus: 20000, unlocks: ['m3'],
    card: "One loop. One Wall. One truth.",
    before: FINAL_BEFORE, afterWin: FINAL_WIN, afterLose: FINAL_LOSE, loseAlt: [FINAL_LOSE_2, FINAL_LOSE_3],
  },
];

/** End card after the final event: follows the choice made before it (`deal` = traded the evidence, otherwise public). */
export const EPILOGUE_3: Record<'public' | 'deal', { title: string; text: string; credits: string[] }> = {
  public: {
    title: "The Wall Remembers",
    text: "Cain drove one lap at dawn, hands shaking, grinning. The Wall has a new hand beside his. Calloway faces a judge. Dante pays the fine and smiles, politely.",
    credits: ["NEON SPEED", "Every street remembers who bled for it.", "Chapter 4 is on the open road."],
  },
  deal: {
    title: "The Quiet Wall",
    text: "The Wall is Dante's now, painted black and gold. Cain still broadcasts, a little quieter. Mara does not answer the phone. Some roads you only drive once.",
    credits: ["NEON SPEED", "Some doors you choose twice.", "Chapter 4 is on the open road."],
  },
};
