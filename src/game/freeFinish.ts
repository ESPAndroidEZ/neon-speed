import type { SaveStore } from '../core/save';
import type { RaceResult } from '../core/raceResult';
import { findCar } from '../data/cars';
import { findRival, RIVALS } from '../data/rivals';
import { duelCash, duelFlag } from '../core/duels';
import { repNote } from './repAward';
import { money } from '../ui/uiKit';
import { t } from '../i18n';
import type { Weather } from '../types/game';

/**
 * The end of a race that is not a story event (free race, rival duel, city race): the record, REP, and for a duel won
 * for the first time the rival's car (in their paint) and a cash prize. A race against exactly one rival is a duel.
 * Lines go to `r.note` for the results screen.
 */
export function freeFinish(store: SaveStore, rivalIds: readonly string[], weather: Weather, r: RaceResult, paid: boolean): void {
  store.recordRace(r.cash, r.bestLap, weather);
  if (!paid) return;
  const notes = [r.note, repNote(store, r, false)];
  const id = rivalIds.length === 1 ? rivalIds[0] : null;
  if (id && r.position === 1 && RIVALS.some((x) => x.id === id) && !store.data.career.flags[duelFlag(id)]) {
    const rv = findRival(id);
    store.data.career.flags[duelFlag(id)] = true;
    store.data.cash += duelCash(rv.skill);
    if (!store.owns(rv.carId)) { store.grantCar(rv.carId, rv.color, rv.glow); notes.push(t('duel.car', { car: `${findCar(rv.carId).brand} ${findCar(rv.carId).name}` })); }
    store.commit();
    notes.push(t('duel.won', { name: rv.name, cash: money(duelCash(rv.skill)) }));
  }
  r.note = notes.filter(Boolean).join(' · ');
}
