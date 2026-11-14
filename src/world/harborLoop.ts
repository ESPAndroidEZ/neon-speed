import { createTrack, type Ctrl, type Track } from './track';

/** "Harbor Loop": ~1.4 km, 14 m wide. Long harbor-side straight, fast east sweepers, a tight infield hairpin. */
export const HARBOR_CTRL: Ctrl = [
  [-110, -114], [-40, -115], [90, -112], [200, -100], [262, -55], [272, 10], [240, 70], [170, 95], [110, 70],
  [95, 20], [60, -25], [10, -30], [-30, 10], [-20, 60], [-70, 100], [-140, 95], [-200, 60], [-230, 0], [-215, -70], [-170, -110],
];

export const createHarborLoop = (): Track => createTrack('Harbor Loop', HARBOR_CTRL, 14, 3, 9);
