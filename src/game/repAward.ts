import type { SaveStore } from '../core/save';
import type { RaceResult } from '../core/raceResult';
import { levelCash, raceRep } from '../core/rep';
import { money } from '../ui/uiKit';
import { t } from '../i18n';

/** REP for a finished race (story events pay half as much again; a failed story event a third): saved, and the line for the results screen. */
export function repNote(store: SaveStore, r: RaceResult, story: boolean, passed = true): string {
  const n = Math.round(raceRep(r.position, r.racers.length, story) * (passed ? 1 : 0.3));
  const g = store.addRep(n);
  const base = t('rep.gain', { n });
  if (g.up <= 0) return base;
  let cash = 0;
  for (let l = g.level - g.up + 1; l <= g.level; l++) cash += levelCash(l);
  return `${base} · ${t('rep.upNote', { n: g.level, cash: money(cash) })}`;
}
