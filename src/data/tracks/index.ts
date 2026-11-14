import { buildStreetPath } from '../../world/streetPath';
import { createTrackFromPath, type Track } from '../../world/track';
import { CLIFFSIDE_RUN } from './cliffsideRun';
import { CONTAINER_DRIFT, CONTAINER_MAZE } from './containerMaze';
import { KESTREL_BAY } from './kestrelBay';
import { NEON_STRIP } from './neonStrip';
import type { TrackDef } from './types';

export type { EventType, Theme, TrackDef } from './types';

/** Every map, in menu order. Add a file under src/data/tracks and list it here. */
export const TRACKS: readonly TrackDef[] = [KESTREL_BAY, NEON_STRIP, CONTAINER_MAZE, CLIFFSIDE_RUN, CONTAINER_DRIFT];

export const findTrackDef = (id: string): TrackDef => TRACKS.find((t) => t.id === id) ?? TRACKS[0];

/** Pure road data for a map (no rendering): the same call feeds the world, the AI, the minimap and the tests. */
export function buildTrack(def: TrackDef): Track {
  return createTrackFromPath(def.name, buildStreetPath(def.vertices), 3, def.start, { elevation: def.elevation, sprintEnd: def.sprintEnd });
}
