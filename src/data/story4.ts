import type { StoryEvent } from './story';
import { YARD_BEFORE, YARD_WIN, YARD_LOSE, YARD_LOSE_2, YARD_LOSE_3, CRANE_BEFORE, CRANE_WIN, CRANE_LOSE, CRANE_LOSE_2, CRANE_LOSE_3, CLIFF_BEFORE, CLIFF_WIN, CLIFF_LOSE, CLIFF_LOSE_2, CLIFF_LOSE_3, BROKER_BEFORE, BROKER_WIN, BROKER_LOSE, BROKER_LOSE_2, BROKER_LOSE_3 } from './storyLines4';

/** Chapter 4, "Neon Harbor" (docs/story.md, Season 2 arc): opens after the Chapter 3 epilogue. Four events on four different maps. */
export const CHAPTER_4 = { id: 4, title: "Neon Harbor", tagline: "The docks are for sale. The Loop is next." };

export const EVENTS_4: StoryEvent[] = [
  {
    id: 'c4-yard', cutBefore: 'prologue', chapter: 4, trackId: 'maze', title: "The Yard Crew", blurb: "Pixel runs the harbour now. Race the container yard in the rain. Top two.",
    kind: 'race', weather: 'RAIN', laps: 3, rivals: ['pixel', 'lola', 'jinx'], skillScale: 1, needPosition: 2, bonus: 10000, unlocks: [],
    card: "Wet steel, tight stacks.",
    before: YARD_BEFORE, afterWin: YARD_WIN, afterLose: YARD_LOSE, loseAlt: [YARD_LOSE_2, YARD_LOSE_3],
  },
  {
    id: 'c4-cranes', chapter: 4, trackId: 'maze-drift', title: "Crane Lights", blurb: "Madame Adeyemi wants a show. Slide the crane yard and bank the points.",
    kind: 'drift', weather: 'CLEAR', laps: 3, rivals: [], skillScale: 1, needPosition: 1, driftTarget: 12000, bonus: 10000, unlocks: [],
    card: "Slide for the Broker.",
    before: CRANE_BEFORE, afterWin: CRANE_WIN, afterLose: CRANE_LOSE, loseAlt: [CRANE_LOSE_2, CRANE_LOSE_3],
  },
  {
    id: 'c4-cliff', chapter: 4, trackId: 'cliff', title: "The Cliff Lodge", blurb: "The proof is in a lodge above the sea. Beat her people up the cliff road. Rain, top two.",
    kind: 'race', weather: 'RAIN', laps: 1, rivals: ['rook', 'nova', 'tank'], skillScale: 1, needPosition: 2, bonus: 11000, unlocks: [],
    card: "One road up. Be first.",
    before: CLIFF_BEFORE, afterWin: CLIFF_WIN, afterLose: CLIFF_LOSE, loseAlt: [CLIFF_LOSE_2, CLIFF_LOSE_3],
  },
  {
    id: 'c4-broker', chapter: 4, trackId: 'neon', title: "The Broker's Loop", blurb: "The whole harbour on the grid. Beat the Broker on the Neon Strip. Top two.",
    kind: 'race', weather: 'CLEAR', laps: 3, rivals: ['calloway', 'dante', 'vex'], skillScale: 1, needPosition: 2, bonus: 14000, unlocks: [],
    card: "Win the city back.",
    before: BROKER_BEFORE, afterWin: BROKER_WIN, afterLose: BROKER_LOSE, loseAlt: [BROKER_LOSE_2, BROKER_LOSE_3],
  },
];

/** End card after the last event of Chapter 4. */
export const EPILOGUE_4 = {
  title: "The Harbour Stays Lit",
  text: "The Broker's list went public by morning. Three inspectors resigned and the docks were never sold. Pixel hung a sign over the yard gate: OPEN ALL NIGHT.",
  credits: ["NEON SPEED", "Every light in the harbour is somebody's.", "Chapter 5 waits on the Bay Bridge."],
};
