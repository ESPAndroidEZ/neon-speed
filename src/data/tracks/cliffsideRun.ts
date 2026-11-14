import type { TrackDef } from './types';

/** Point-to-point coastal sprint over hills: ocean on one side, rock and guard rails on the other. */
export const CLIFFSIDE_RUN: TrackDef = {
  id: 'cliff',
  name: 'Cliffside Run',
  district: 'North Coast',
  blurb: 'A point-to-point sprint along the north coast: climbs, crests and sweepers above the ocean. One run, no laps, and nothing to hold you if you get it wrong.',
  theme: 'cliff',
  type: 'sprint',
  vertices: [
    { x: -140, z: 0, r: 100, zone: 'cliff', w: 11 },
    { x: 600, z: 0, r: 100, zone: 'cliff', w: 11 },
    { x: 780, z: 200, r: 130, zone: 'cliff', w: 11 },
    { x: 560, z: 400, r: 100, zone: 'cliff', w: 11 },
    { x: 640, z: 660, r: 110, zone: 'cliff', w: 11 },
    { x: 340, z: 780, r: 100, zone: 'cliff', w: 11 },
    { x: 100, z: 620, r: 90, zone: 'cliff', w: 10 },
    { x: -140, z: 360, r: 100, zone: 'cliff', w: 10 },
  ],
  start: [40, 0],
  laps: 1,
  propsDensity: 0.2,
  defaultWeather: 'CLEAR',
  recommendedWeather: ['CLEAR', 'SNOW'],
  sprintEnd: 0.8,
  elevation: [
    { at: 0, h: 0 }, { at: 0.12, h: 12 }, { at: 0.26, h: 4 }, { at: 0.4, h: 26 }, { at: 0.52, h: 18 },
    { at: 0.64, h: 36 }, { at: 0.76, h: 20 }, { at: 0.86, h: 8 }, { at: 0.95, h: 2 },
  ],
};
