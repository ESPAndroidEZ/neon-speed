import type { Weather } from '../../types/game';
import type { ElevationPoint } from '../../world/track';
import type { Vertex } from '../../world/streetPath';

/** circuit: laps round a loop. sprint: one run from start to finish. drift: laps scored by drift points, no rivals. */
export type EventType = 'circuit' | 'sprint' | 'drift';
export type Theme = 'city' | 'port' | 'cliff';

/** Everything that makes a map: data only, no code. The world, the minimap and the menus are built from it. */
export interface TrackDef {
  id: string;
  name: string;
  district: string;
  blurb: string;
  theme: Theme;
  type: EventType;
  /** Corners of the closed road polygon; `r` is the fillet radius, `w` the road width of the leg that starts there. */
  vertices: readonly Vertex[];
  /** Start / finish line position (the grid sits behind it). */
  start: readonly [number, number];
  laps: number;
  /** 0..1 scales the parked cars, cones and street dressing. */
  propsDensity: number;
  defaultWeather: Weather;
  recommendedWeather: Weather[];
  /** Road height profile (visual only). */
  elevation?: readonly ElevationPoint[];
  /** Sprint: fraction of the loop where the race ends. */
  sprintEnd?: number;
  /** Drift events: points that count as a win. */
  driftTarget?: number;
  /** Plaza island (city theme), if the map has one. */
  plaza?: { x: number; z: number; r: number };
}
