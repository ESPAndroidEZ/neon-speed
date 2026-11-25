import type { RoadGraph } from '../types/world';
import type { RaceResult } from '../core/raceManager';
import type { ResultsExtra } from '../ui/results';
import { isCityTrack, placeCityRaces, type CityRace } from '../core/cityRace';
import { setTrackResolver } from '../data/tracks';
import { generateRoads } from '../world/roads/generate';
import { planCityEvent } from '../core/cityEvents';

/** City seed: the same as Free Drive's city (game/freeRoam.ts build). */
const SEED = 7;
/** Start ring radius (m) and the speed under which the race offer shows (m/s, ~40 km/h). */
export const RING = 9;
const SLOW = 11;

let planned: CityRace[] | null = null, graph: RoadGraph | null = null;
/** The city's road graph (Free Drive's own when it was built; node ids are the same for the same seed). */
export const cityGraph = (): RoadGraph => (graph ??= generateRoads(SEED));
/** The city races with a start ring, planned once (from the city's graph when Free Drive builds it, else from a fresh graph). */
export function cityRaces(g?: RoadGraph): CityRace[] {
  if (g) graph ??= g;
  planned ??= placeCityRaces(cityGraph());
  return planned;
}
/** Any city event by map id: a ring race, or an outrun rebuilt from its id. */
export const findCityEvent = (id: string): CityRace | null => planCityEvent(cityGraph(), id, cityRaces());
// a saved or restarted city race finds its map even before Free Drive was opened this session
setTrackResolver((id) => (isCityTrack(id) ? findCityEvent(id)?.def : undefined));

/**
 * Between the Free Drive step and the launcher (game/cityRaceLaunch.ts): `offer` shows or hides the race offer,
 * `result` builds the results extras when a city race ends (called from freeRace.ts).
 */
export const CITY_HOOK: { offer(r: CityRace | null): void; result(r: RaceResult, id: string): ResultsExtra | undefined } = {
  offer: () => {},
  result: () => undefined,
};

/** Which start ring the car is in, stepped from RoamActivities. The offer only shows after the car was outside every ring. */
export class CityRaceSpots {
  readonly races: CityRace[];
  private inside = -1;
  private armed = false;

  constructor(g: RoadGraph) {
    this.races = cityRaces(g);
  }

  /** After a teleport or a return from a race: wait until the car has left the ring it stands in. */
  place(x: number, z: number): void {
    this.inside = -1;
    this.armed = this.find(x, z) < 0;
    CITY_HOOK.offer(null);
  }

  step(x: number, z: number, speed: number): void {
    const at = this.find(x, z);
    if (at < 0) { this.armed = true; if (this.inside >= 0) { this.inside = -1; CITY_HOOK.offer(null); } return; }
    if (!this.armed || at === this.inside || Math.abs(speed) > SLOW) return;
    this.inside = at;
    CITY_HOOK.offer(this.races[at]);
  }

  private find(x: number, z: number): number {
    for (let i = 0; i < this.races.length; i++) { const r = this.races[i]; if ((r.x - x) * (r.x - x) + (r.z - z) * (r.z - z) < RING * RING) return i; }
    return -1;
  }
}
