import type { TrackDef } from './types';

const MAZE: TrackDef['vertices'] = [
  { x: -40, z: 0, r: 12, zone: 'yard', w: 10 },
  { x: 200, z: 0, r: 12, zone: 'yard', w: 9 },
  { x: 200, z: 80, r: 12, zone: 'yard', w: 9 },
  { x: 100, z: 80, r: 11, zone: 'yard', w: 9 },
  { x: 100, z: 160, r: 11, zone: 'yard', w: 9 },
  { x: 260, z: 160, r: 12, zone: 'dock', w: 11 },
  { x: 260, z: 300, r: 14, zone: 'dock', w: 11 },
  { x: 60, z: 300, r: 11, zone: 'yard', w: 9 },
  { x: 60, z: 230, r: 11, zone: 'yard', w: 9 },
  { x: -40, z: 230, r: 11, zone: 'yard', w: 9 },
];

/** Port yard between stacked containers: very tight corners and a straight under the gantry cranes. */
export const CONTAINER_MAZE: TrackDef = {
  id: 'maze',
  name: 'Container Maze',
  district: 'Redline Docks',
  blurb: 'A port yard of stacked containers. Nine-metre lanes, ninety-degree corners and a crane straight to catch your breath. Brakes first, heroics later.',
  theme: 'port',
  type: 'circuit',
  vertices: MAZE,
  start: [60, 0],
  laps: 4,
  propsDensity: 0.5,
  defaultWeather: 'CLEAR',
  recommendedWeather: ['CLEAR', 'SNOW'],
};

/** The same yard as a drift event: no rivals, score points for sliding between the stacks. */
export const CONTAINER_DRIFT: TrackDef = {
  ...CONTAINER_MAZE,
  id: 'maze-drift',
  name: 'Container Drift',
  blurb: 'The maze after hours, no rivals. Chain slides between the stacks: 12,000 points wins the night.',
  type: 'drift',
  laps: 3,
  driftTarget: 12000,
  defaultWeather: 'RAIN',
  recommendedWeather: ['RAIN', 'CLEAR'],
};
