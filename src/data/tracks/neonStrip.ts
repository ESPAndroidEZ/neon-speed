import type { TrackDef } from './types';

/** Downtown boulevards with tram lines, an S-bend through the side streets and a tunnel under the exchange. */
export const NEON_STRIP: TrackDef = {
  id: 'neon',
  name: 'Neon Strip',
  district: 'Downtown',
  blurb: 'Wide boulevards, tram lines in the middle of the road, a side-street zig-zag and a long tunnel. Fast, bright, unforgiving of late braking.',
  theme: 'city',
  type: 'circuit',
  vertices: [
    { x: -60, z: 0, r: 55, zone: 'boulevard', w: 18 },
    { x: 380, z: 0, r: 60, zone: 'street', w: 15 },
    { x: 380, z: 170, r: 40, zone: 'street', w: 14 },
    { x: 260, z: 170, r: 30, zone: 'street', w: 14 },
    { x: 260, z: 260, r: 30, zone: 'street', w: 14 },
    { x: 380, z: 260, r: 34, zone: 'boulevard', w: 18 },
    { x: 380, z: 420, r: 50, zone: 'tunnel', w: 15 },
    { x: 80, z: 420, r: 50, zone: 'street', w: 14 },
    { x: 80, z: 300, r: 35, zone: 'street', w: 14 },
    { x: -60, z: 300, r: 40, zone: 'boulevard', w: 18 },
  ],
  start: [60, 0],
  laps: 3,
  propsDensity: 0.7,
  defaultWeather: 'RAIN',
  recommendedWeather: ['RAIN', 'CLEAR'],
};
