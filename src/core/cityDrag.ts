import type { RoadGraph } from '../types/world';
import type { TrackDef } from '../data/tracks/types';
import { buildTrack } from '../data/tracks';
import { validateTrack } from '../world/trackValidate';
import { cityId, type CityRace } from './cityRace';

/** The drag strip (m): a straight this long, a return road this far to the side. The race is the straight only. */
const STRAIGHT = 1000, SIDE = 70, R = 30, W = 18;

/**
 * Drag race at the airport runway (Underground round, stage 3): a ring at the runway's end in the city; the race map is a
 * long straight with a return road (a sprint whose finish is the end of the straight), one rival, manual gears (shift
 * timing, see game/inputSetup). Pure; null when the city has no runway.
 */
export function planDrag(g: RoadGraph): CityRace | null {
  const e = g.edges.find((x) => x.kind === 'runway');
  if (!e) return null;
  const a = g.nodes[e.a], b = g.nodes[e.b], h = Math.atan2(b.x - a.x, b.z - a.z), half = STRAIGHT / 2;
  const vertices = [
    { x: 0, z: -half, r: R, zone: 'street' as const, w: W }, { x: 0, z: half, r: R, zone: 'street' as const, w: W },
    { x: SIDE, z: half, r: R, zone: 'street' as const, w: W }, { x: SIDE, z: -half, r: R, zone: 'street' as const, w: W },
  ];
  const def: TrackDef = {
    id: cityId('drag', a.district), name: 'Runway Drag', district: 'Runway', blurb: 'A straight line on the old runway: launch, shift on time, hold it flat.',
    theme: 'port', type: 'sprint', vertices, start: [0, -half + 70], laps: 1, propsDensity: 0.3, defaultWeather: 'CLEAR', recommendedWeather: ['CLEAR'],
  };
  const tr0 = buildTrack(def);
  def.sprintEnd = (STRAIGHT - 70 - R - 10) / tr0.length; // finish just before the far corner
  const tr = buildTrack(def);
  if (validateTrack(tr, { minLength: 1000, maxLength: 3000, sprint: true }).length) return null;
  const len = STRAIGHT - 70 - R - 10;
  return { id: def.id, district: a.district, x: a.x, z: a.z, heading: h, def, length: tr.length, ox: 0, oz: 0, edges: [e.id], kind: 'drag', fx: a.x + Math.sin(h) * len, fz: a.z + Math.cos(h) * len };
}
