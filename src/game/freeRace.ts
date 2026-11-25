import type { RaceResult } from '../core/raceManager';
import type { SaveStore } from '../core/save';
import type { TrackDef } from '../data/tracks';
import type { Weather } from '../types/game';
import type { ResultsExtra } from '../ui/results';
import { driftCash } from '../core/career';
import { t } from '../i18n';
import { submitLapBoard } from './leaderboardHook';
import { isCityTrack } from '../core/cityRace';
import { CITY_HOOK } from './cityRaces';
import { driftMedal, medalFor, medalRank, MEDAL_PAY, type Medal } from '../core/medals';
import { money } from '../ui/uiKit';

/**
 * Free race bookkeeping for the map that was just driven: personal bests per map and weather, and the verdict for
 * a drift event (target score, cash from points). Call before the cash is banked; returns the results extras for drift events.
 */
export function finishFreeRace(store: SaveStore, def: TrackDef, weather: Weather, r: RaceResult, again: () => void, menu: () => void): ResultsExtra | undefined {
  if (def.type === 'drift') {
    r.cash = driftCash(r.driftScore);
    const before = store.data.trackBest[`${def.id}:drift`];
    const record = store.recordTrack(`${def.id}:drift`, r.driftScore, false);
    const medal = medalLine(store, driftMedal(def.driftTarget, r.driftScore), driftMedal(def.driftTarget, before));
    const passed = r.driftScore >= (def.driftTarget ?? 0);
    if (isCityTrack(def.id)) return CITY_HOOK.result(r, def.id); // a city drift run returns to Free Drive
    return {
      objective: t('free.drift', { score: r.driftScore.toLocaleString(), target: (def.driftTarget ?? 0).toLocaleString() }) + (record ? ` · ${t('free.newBest')}` : ''),
      passed,
      notes: medal ? [medal] : undefined,
      buttons: [{ label: t('res.again'), hot: true, action: again }, { label: t('common.menu'), action: menu }],
    };
  }
  const key = `${def.id}:${weather}`;
  const prev = store.data.trackBest[key];
  const record = store.recordTrack(key, r.totalTime);
  r.note = [pbNote(prev, r.totalTime, record), medalLine(store, medalFor(def.id, weather, r.totalTime), medalFor(def.id, weather, prev))].filter(Boolean).join(' · ');
  if (isCityTrack(def.id)) return CITY_HOOK.result(r, def.id); // the server's lap boards only know the fixed maps
  submitLapBoard(store, def, weather, r); // online lap board (sent in the background, the results line fills in)
  return undefined;
}

const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, '0')}`;

/** One line about the player's own best time on this map and weather. Empty when the run did not finish. */
export function pbNote(prev: number | undefined, time: number, record: boolean): string {
  if (!(time > 0)) return '';
  if (prev === undefined) return t('free.pbFirst', { time: mmss(time) });
  const delta = Math.abs(time - prev).toFixed(2);
  return record ? t('free.pbNew', { delta }) : t('free.pbMiss', { time: mmss(prev), delta });
}

/** A medal better than the best so far pays once (cash and REP) and says so on the results screen; '' when there is nothing new. */
function medalLine(store: SaveStore, now: Medal | null, was: Medal | null): string {
  if (!now || medalRank(now) <= medalRank(was)) return '';
  const pay = MEDAL_PAY[now];
  store.data.cash += pay.cash;
  store.addRep(pay.rep);
  return t(`medal.${now}`, { cash: money(pay.cash), rep: pay.rep });
}
