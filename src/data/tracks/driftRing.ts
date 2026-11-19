import type { TrackDef } from './types';

/** A near-perfect circle: twelve corners with a 170 m fillet, no straight worth the name. Hold a slide for the whole lap. */
const RING: TrackDef['vertices'] = [
  { x: 190, z: 0, r: 170, zone: 'dock', w: 16 },
  { x: 165, z: 95, r: 170, zone: 'dock', w: 16 },
  { x: 95, z: 165, r: 170, zone: 'dock', w: 16 },
  { x: 0, z: 190, r: 170, zone: 'dock', w: 16 },
  { x: -95, z: 165, r: 170, zone: 'dock', w: 16 },
  { x: -165, z: 95, r: 170, zone: 'dock', w: 16 },
  { x: -190, z: 0, r: 170, zone: 'dock', w: 16 },
  { x: -165, z: -95, r: 170, zone: 'dock', w: 16 },
  { x: -95, z: -165, r: 170, zone: 'dock', w: 16 },
  { x: 0, z: -190, r: 170, zone: 'dock', w: 16 },
  { x: 95, z: -165, r: 170, zone: 'dock', w: 16 },
  { x: 165, z: -95, r: 170, zone: 'dock', w: 16 },
];

/** Drift Ring: curves only. One huge sweeping bend, wide enough to stay sideways; the score is all about holding the chain. */
export const DRIFT_RING: TrackDef = {
  id: 'drift-ring',
  name: 'Drift Ring',
  district: 'Redline Docks',
  blurb: 'A dock circle with no straights. Pitch the car in, hold the slide and keep the chain alive: 8,000 points wins.',
  theme: 'port',
  type: 'drift',
  vertices: RING,
  start: [178, 48],
  laps: 3,
  propsDensity: 0.3,
  defaultWeather: 'CLEAR',
  recommendedWeather: ['CLEAR', 'RAIN'],
  driftTarget: 8000,
};

/** Left-right sweepers in a long loop: every bend flips the slide, so the chain needs a clean transition. */
const SERPENT: TrackDef['vertices'] = [
  { x: 0, z: 0, r: 100, zone: 'street', w: 15 },
  { x: 170, z: 70, r: 100, zone: 'street', w: 15 },
  { x: 340, z: 0, r: 100, zone: 'street', w: 15 },
  { x: 510, z: 70, r: 100, zone: 'street', w: 15 },
  { x: 680, z: 0, r: 70, zone: 'street', w: 15 },
  { x: 740, z: 170, r: 70, zone: 'street', w: 15 },
  { x: 680, z: 340, r: 100, zone: 'street', w: 15 },
  { x: 510, z: 270, r: 100, zone: 'street', w: 15 },
  { x: 340, z: 340, r: 100, zone: 'street', w: 15 },
  { x: 170, z: 270, r: 100, zone: 'street', w: 15 },
  { x: 0, z: 340, r: 70, zone: 'street', w: 15 },
  { x: -60, z: 170, r: 70, zone: 'street', w: 15 },
];

/** Serpent Drift: only curves, alternating direction. Transitions are where the points are won or lost. */
export const SERPENT_DRIFT: TrackDef = {
  id: 'serpent-drift',
  name: 'Serpent Drift',
  district: 'Kestrel Bay',
  blurb: 'Nothing but sweeping bends, left then right then left. Flick the car across and keep the chain: 7,000 points wins.',
  theme: 'city',
  type: 'drift',
  vertices: SERPENT,
  start: [85, 35],
  laps: 3,
  propsDensity: 0.4,
  defaultWeather: 'RAIN',
  recommendedWeather: ['RAIN', 'CLEAR', 'SNOW'],
  driftTarget: 7000,
};
