import type { RaceResult } from '../core/raceManager';
import type { SaveStore } from '../core/save';
import type { TrackDef } from '../data/tracks';
import type { Weather } from '../types/game';
import type { ResultsExtra } from '../ui/results';
import { driftCash } from '../core/career';

/**
 * Free race bookkeeping for the map that was just driven: personal bests per map and weather, and the verdict for
 * a drift event (target score, cash from points). Call before the cash is banked; returns the results extras for drift events.
 */
export function finishFreeRace(store: SaveStore, def: TrackDef, weather: Weather, r: RaceResult, again: () => void, menu: () => void): ResultsExtra | undefined {
  if (def.type === 'drift') {
    r.cash = driftCash(r.driftScore);
    const record = store.recordTrack(`${def.id}:drift`, r.driftScore, false);
    const passed = r.driftScore >= (def.driftTarget ?? 0);
    return {
      objective: `${r.driftScore.toLocaleString()} drift points (target ${(def.driftTarget ?? 0).toLocaleString()})${record ? ' · new best!' : ''}`,
      passed,
      buttons: [{ label: 'Again', hot: true, action: again }, { label: 'Menu', action: menu }],
    };
  }
  store.recordTrack(`${def.id}:${weather}`, r.totalTime);
  return undefined;
}
