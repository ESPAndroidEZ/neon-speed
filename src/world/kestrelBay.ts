import { buildStreetPath, type Vertex } from './streetPath';
import { createTrackFromPath, type Track } from './track';

/**
 * "Kestrel Bay Streets": about 1.4 km of city street, 8.5 to 11 m wide. Clockwise from the start line:
 * Main Street, a bridge over the canal, a hairpin round the plaza, the dock strip along the water,
 * then back through two alleys and a tunnel.
 */
export const KESTREL_VERTICES: readonly Vertex[] = [
  { x: -70, z: 0, r: 20, zone: 'street', w: 11 }, // corner onto Main Street
  { x: 30, z: 0, r: 0, zone: 'street', w: 11 }, // start / finish line
  { x: 250, z: 0, r: 24, zone: 'street', w: 10 },
  { x: 250, z: 25, r: 0, zone: 'bridge', w: 10 },
  { x: 250, z: 65, r: 0, zone: 'street', w: 10 },
  { x: 250, z: 100, r: 18, zone: 'street', w: 10 },
  { x: 150, z: 100, r: 15, zone: 'plaza', w: 11 }, // plaza hairpin, part 1
  { x: 150, z: 130, r: 15, zone: 'street', w: 10 }, // part 2
  { x: 205, z: 130, r: 16, zone: 'street', w: 10 },
  { x: 205, z: 300, r: 18, zone: 'dock', w: 11 }, // south, then the dock strip west
  { x: -70, z: 300, r: 20, zone: 'street', w: 10 },
  { x: -70, z: 230, r: 14, zone: 'alley', w: 8.5 },
  { x: -140, z: 230, r: 14, zone: 'tunnel', w: 9 },
  { x: -140, z: 110, r: 14, zone: 'alley', w: 8.5 },
  { x: -70, z: 110, r: 14, zone: 'street', w: 10 },
];

export const createKestrelBay = (): Track => createTrackFromPath('Kestrel Bay Streets', buildStreetPath(KESTREL_VERTICES), 3, [30, 0]);

/** The round plaza: both hairpin arcs share this centre (the U wraps a fountain island). */
export const PLAZA = { x: 165, z: 115, r: 15 };
