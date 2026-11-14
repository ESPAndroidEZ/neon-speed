import { KESTREL_VERTICES, PLAZA } from '../../world/kestrelBay';
import type { TrackDef } from './types';

export const KESTREL_BAY: TrackDef = {
  id: 'kestrel',
  name: 'Kestrel Bay Streets',
  district: 'Kestrel Bay',
  blurb: 'The home loop: Main Street, a canal bridge, the plaza hairpin, the dock strip and a tunnel.',
  theme: 'city',
  type: 'circuit',
  vertices: KESTREL_VERTICES,
  start: [30, 0],
  laps: 3,
  propsDensity: 1,
  defaultWeather: 'CLEAR',
  recommendedWeather: ['CLEAR', 'RAIN'],
  plaza: PLAZA,
};
