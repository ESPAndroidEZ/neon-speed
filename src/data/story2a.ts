import type { StoryEvent } from './story';
import { MAZE_BEFORE, MAZE_LOSE, MAZE_LOSE_2, MAZE_LOSE_3, MAZE_WIN, NEON_BEFORE, NEON_LOSE, NEON_LOSE_2, NEON_LOSE_3, NEON_WIN, REDLINE_BEFORE, REDLINE_LOSE, REDLINE_LOSE_2, REDLINE_LOSE_3, REDLINE_WIN } from './storyLines2a';

/** Chapter 2, part one: Dante's retaliation, then the Neon Strip and the Container Maze. Text lives in storyLines2a.ts. */
export const EVENTS_2A: StoryEvent[] = [
  {
    id: 'c2-redline', cutBefore: 'ch2-open', chapter: 2, title: 'Redline Rising', blurb: 'Dante answers with lawyers, trucks and a roadblock on the Loop. Break through. Top two.',
    kind: 'race', weather: 'CLEAR', laps: 2, rivals: ['rook', 'vex', 'jinx'], skillScale: 0.95, needPosition: 2, bonus: 4000, unlocks: [],
    card: 'Redline wants the street back. Take it first.',
    before: REDLINE_BEFORE, afterWin: REDLINE_WIN, afterLose: REDLINE_LOSE, loseAlt: [REDLINE_LOSE_2, REDLINE_LOSE_3],
  },
  {
    id: 'c2-neon', chapter: 2, trackId: 'neon', title: 'Neon Night', blurb: 'Downtown. Nova rules the Neon Strip and the council vote that comes with it. Wet boulevards. Top two.',
    kind: 'race', weather: 'RAIN', laps: 3, rivals: ['nova', 'pixel', 'lola', 'vex'], skillScale: 1, needPosition: 2, bonus: 6000, unlocks: ['rx7'],
    card: 'Neon, rain and tram lines. Cross the rails straight.',
    before: NEON_BEFORE, afterWin: NEON_WIN, afterLose: NEON_LOSE, loseAlt: [NEON_LOSE_2, NEON_LOSE_3],
  },
  {
    id: 'c2-maze', chapter: 2, trackId: 'maze', title: 'Container Maze', blurb: 'The port yard. Brick owns the lanes, and he never lifts. First snow of the winter. Top two.',
    kind: 'race', weather: 'SNOW', laps: 4, rivals: ['brick', 'tank', 'rook', 'jinx'], skillScale: 1, needPosition: 2, bonus: 7000, unlocks: ['evo'],
    card: 'Nine metres of lane and a man who will not move.',
    before: MAZE_BEFORE, afterWin: MAZE_WIN, afterLose: MAZE_LOSE, loseAlt: [MAZE_LOSE_2, MAZE_LOSE_3],
  },
];
