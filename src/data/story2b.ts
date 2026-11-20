import type { StoryEvent } from './story';
import { CLIFF_BEFORE, CLIFF_LOSE, CLIFF_LOSE_2, CLIFF_LOSE_3, CLIFF_WIN, YARD_BEFORE, YARD_LOSE, YARD_LOSE_2, YARD_LOSE_3, YARD_WIN } from './storyLines2b';
import { FINAL_BEFORE, FINAL_LOSE, FINAL_LOSE_2, FINAL_LOSE_3, FINAL_OPEN_REPLY, FINAL_SPONSOR_REPLY, FINAL_WIN } from './storyLines2c';

/** Chapter 2, part two: the yard drift night, the Cliffside Run and the finale with its branching choice. Text lives in storyLines2b/2c.ts. */
export const EVENTS_2B: StoryEvent[] = [
  {
    id: 'c2-yard', chapter: 2, trackId: 'maze-drift', title: 'Yard Drift Night', blurb: 'After hours in the Maze. No rivals: 12,000 drift points to win the dock crews.',
    kind: 'drift', weather: 'RAIN', laps: 3, rivals: [], skillScale: 1, needPosition: 99, driftTarget: 12000, bonus: 6000, unlocks: [],
    card: 'Rain on steel. Draw lines between the stacks.',
    before: YARD_BEFORE, afterWin: YARD_WIN, afterLose: YARD_LOSE, loseAlt: [YARD_LOSE_2, YARD_LOSE_3],
  },
  {
    id: 'c2-cliff', chapter: 2, trackId: 'cliff', title: 'Cliffside Run', blurb: 'The north coast. Calloway owns the road, the rail and the view. One run to the finish. Win it.',
    kind: 'race', weather: 'CLEAR', weatherChange: { at: 35, to: 'SNOW' }, laps: 1, rivals: ['calloway', 'nova', 'jinx'], skillScale: 1, needPosition: 1, bonus: 10000, unlocks: [],
    card: 'No laps. No second chances. Mind the edge.',
    cues: [{ at: 14, dur: 3.6, kind: 'lower', text: 'Mara: Crests ahead. Lift before them, the sea is not a corner.' }],
    before: CLIFF_BEFORE, afterWin: CLIFF_WIN, afterLose: CLIFF_LOSE, loseAlt: [CLIFF_LOSE_2, CLIFF_LOSE_3],
  },
  {
    id: 'c2-final', cutBefore: 'ch2-council', chapter: 2, title: 'The Open Loop', blurb: 'The Council meets at the Wall. Two doors, one race. Win it for the street.',
    kind: 'race', weather: 'RAIN', weatherChange: { at: 90, to: 'SNOW' }, laps: 3, rivals: ['dante', 'calloway', 'nova', 'brick'], skillScale: 1.02, needPosition: 2, bonus: 12000, unlocks: [],
    rivalsIf: { sponsor: ['dante', 'calloway', 'vex', 'tank'] },
    card: 'Whatever you choose tonight, the street will remember.',
    cues: [
      { at: 14, dur: 3.6, kind: 'switch', if: 'open', text: 'DJ Switch: Pixel is streaming the whole race. The street is on the road with you.' },
      { at: 14, dur: 3.6, kind: 'switch', if: 'sponsor', text: 'DJ Switch: Black and gold in the mirrors. I am still listening, Rookie.' },
      { at: 40, dur: 3.4, kind: 'lower', text: 'Mara: Whatever door you chose, drive it clean.' },
    ],
    before: [
      ...FINAL_BEFORE,
      {
        who: 'dante', mood: 'smirk', text: 'A sponsorship, rookie. No more bank, a pit crew, a season. The Loop gets rules, and rules keep people alive. All I ask is the livery.',
        choice: {
          prompt: 'The Council wants your answer.',
          options: [
            { label: 'Open the Loop to everyone', set: { open: true }, rel: { cain: 2, mara: 1, dante: -2, nova: 1 }, reply: FINAL_OPEN_REPLY },
            { label: 'Accept Redline’s sponsorship', set: { sponsor: true }, rel: { dante: 2, mara: -1, cain: -2, brick: 1 }, reply: FINAL_SPONSOR_REPLY },
          ],
        },
      },
    ],
    afterWin: FINAL_WIN, afterLose: FINAL_LOSE, loseAlt: [FINAL_LOSE_2, FINAL_LOSE_3],
  },
];
