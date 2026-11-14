/**
 * Open-world contracts (free roam). The road network is pure data: no `three` here or in `src/world/roads`.
 * World units are metres, +Y up. The physics stays 2D on the X/Z plane; `heightAt` only lifts and pitches the car.
 */
export type DistrictId = 'harbor' | 'neon' | 'oldtown' | 'coast';
export type RoadKind = 'avenue' | 'street' | 'alley' | 'coast';
export type SurfaceType = 'asphalt' | 'wet' | 'curb' | 'grass';

/** Tyre grip multiplier and extra drag (1/s) per surface. Weather grip multiplies on top. */
export const SURFACES: Readonly<Record<SurfaceType, { grip: number; drag: number }>> = {
  asphalt: { grip: 1, drag: 0 },
  wet: { grip: 0.8, drag: 0.02 },
  curb: { grip: 0.9, drag: 0.12 },
  grass: { grip: 0.6, drag: 0.5 },
};

export interface RoadNode {
  id: number;
  x: number;
  z: number;
  district: DistrictId;
  /** Edge ids meeting here, sorted by bearing. */
  edges: number[];
  /** Junction with traffic lights (4-way on an avenue). */
  light: boolean;
  /** Radius of the junction patch: road ribbons stop this far from the node. */
  radius: number;
}

export interface RoadEdge {
  id: number;
  a: number;
  b: number;
  kind: RoadKind;
  district: DistrictId;
  /** Total lanes (both directions) and full tarmac width in metres. */
  lanes: number;
  width: number;
  /** Centre line a -> b as x0,z0,x1,z1,... and the running length at each point. */
  pts: Float32Array;
  cum: Float32Array;
  length: number;
  /** Speed limit for traffic, m/s. */
  limit: number;
}

export interface RoadGraph {
  seed: number;
  /** World square is [-half, half] on both axes. */
  half: number;
  nodes: RoadNode[];
  edges: RoadEdge[];
}

/** Axis-free building footprint: centre, half extents along its own axes, heading of its local +Z (radians), height. */
export interface Footprint {
  x: number;
  z: number;
  hw: number;
  hd: number;
  rot: number;
  height: number;
  /** Index into the district's archetype list (visual only). */
  style: number;
  district: DistrictId;
}

export type PoiKind = 'garage' | 'shop' | 'race' | 'drift' | 'trap' | 'hangout' | 'photo' | 'handprint';

export interface Poi {
  id: string;
  kind: PoiKind;
  name: string;
  x: number;
  z: number;
  district: DistrictId;
  /** Trigger radius in metres. */
  r: number;
  /** race: track id to launch. trap: target km/h. drift: target score. hangout: rival id. */
  ref?: string;
  target?: number;
}

/** Time of day in hours 0..24 and the weather the world clock has chosen. */
export interface WorldClockState {
  hour: number;
  day: number;
  weather: 'CLEAR' | 'RAIN' | 'SNOW';
  /** Seconds until the next weather roll. */
  nextWeather: number;
}

/** Permanent free-roam progress, kept in the profile save. */
export interface RoamSave {
  x: number;
  z: number;
  heading: number;
  hour: number;
  /** Discovered 128 m cells as "cx,cz". */
  seen: string[];
  /** Collected handprint ids, visited POI ids and best speed-trap / drift-zone results by POI id. */
  hands: string[];
  visited: string[];
  best: Record<string, number>;
  /** Opaque quest manager snapshot (src/quests). */
  quests: unknown;
}
