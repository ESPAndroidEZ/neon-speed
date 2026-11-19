import type { StoryEvent } from './story';
import { DOCK_BEFORE, DOCK_LOSE, DOCK_LOSE_2, DOCK_LOSE_3, DOCK_WIN, DRIFT_BEFORE, DRIFT_LOSE, DRIFT_LOSE_2, DRIFT_LOSE_3, DRIFT_WIN, FINALE_BEFORE, FINALE_LOSE, FINALE_LOSE_2, FINALE_LOSE_3, FINALE_WIN, WARMUP_BEFORE, WARMUP_LOSE, WARMUP_LOSE_2, WARMUP_LOSE_3, WARMUP_WIN } from './storyLines1';

/** Chapter 1, "Wet Asphalt". The first run skips `before` of the warm-up: the race IS the opening (see game/story.ts). Text lives in storyLines1.ts. */
export const EVENTS: StoryEvent[] = [
  {
    id: 'warmup', title: 'Warm-up Circuit', blurb: 'Dry streets, street rookies, and Cain’s old Civic. Finish top two and earn your first red hand.',
    kind: 'race', weather: 'CLEAR', laps: 2, carId: 'civic', rivals: ['pixel', 'lola', 'rook'], skillScale: 0.85, needPosition: 2, bonus: 1500, unlocks: [],
    card: "Warm-up lap. Don't embarrass yourself.",
    cues: [
      { at: 3.6, dur: 3.2, kind: 'lower', text: 'Mara: Gas down. The Civic is light, it pulls hard.' },
      { at: 8.5, dur: 3.4, kind: 'lower', text: 'Mara: Corner! Off the gas, brake early, turn in.' },
      { at: 15, dur: 4.2, kind: 'lower', text: 'Mara: Tap the handbrake mid-corner to swing the tail. Drifting charges your nitro.' },
      { at: 24, dur: 3.6, kind: 'switch', text: 'DJ Switch: Nitro charged? Spend it on a straight. Save nothing.' },
      { at: 34, dur: 3.4, kind: 'lower', text: 'Mara: Top two wins the night. Rivals brake late, so can you.' },
    ],
    before: WARMUP_BEFORE, afterWin: WARMUP_WIN, afterLose: WARMUP_LOSE, loseAlt: [WARMUP_LOSE_2, WARMUP_LOSE_3],
  },
  {
    id: 'dock', title: 'Dock Sprint', blurb: 'Rain. Jinx lives for this. Brake earlier than you think. Finish top two.',
    kind: 'race', weather: 'RAIN', laps: 2, rivals: ['jinx', 'tank', 'rook', 'pixel'], skillScale: 0.95, needPosition: 2, bonus: 3000, unlocks: ['350z'],
    card: 'Wet road, short fuse. Brake earlier than you think.',
    before: DOCK_BEFORE, afterWin: DOCK_WIN, afterLose: DOCK_LOSE, loseAlt: [DOCK_LOSE_2, DOCK_LOSE_3],
  },
  {
    id: 'drift', title: 'Drift Night', blurb: 'First snow. No rivals, just you and the road: score 3,000 drift points in 3 laps.',
    kind: 'drift', weather: 'SNOW', laps: 3, rivals: [], skillScale: 1, needPosition: 99, driftTarget: 3000, bonus: 4000, unlocks: [],
    card: 'First snow. Sideways is the only way.',
    before: DRIFT_BEFORE, afterWin: DRIFT_WIN, afterLose: DRIFT_LOSE, loseAlt: [DRIFT_LOSE_2, DRIFT_LOSE_3],
  },
  {
    id: 'finale', title: 'Harbor Loop vs Dante', blurb: 'Last race. Rain turning to snow. Beat Dante and the garage is saved. You must win.',
    kind: 'race', weather: 'RAIN', weatherChange: { at: 75, to: 'SNOW' }, laps: 3, rivals: ['vex', 'jinx', 'tank', 'dante'], skillScale: 1, needPosition: 1, bonus: 8000, unlocks: ['supra'],
    card: 'Last race. Last chance. Bring everything.',
    before: FINALE_BEFORE, afterWin: FINALE_WIN, afterLose: FINALE_LOSE, loseAlt: [FINALE_LOSE_2, FINALE_LOSE_3],
  },
];
