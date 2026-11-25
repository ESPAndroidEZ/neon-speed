import type { Engine } from '../core/engine';
import type { SaveStore } from '../core/save';
import type { CityRace } from '../core/cityRace';
import type { Game } from './game';
import { CITY_HOOK, findCityEvent } from './cityRaces';
import type { FieldEntry } from '../data/rivals';
import { markVisit } from './flowLaunch';
import { cityRaceOffer } from '../ui/cityRaceOffer';
import { competitiveField } from '../data/rivals';
import { findCar } from '../data/cars';
import { AI_SETTING } from '../physics/aiDifficulty';
import { t, tx } from '../i18n';

const RIVALS = 3;
const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, '0')}`;

/**
 * City races (W5.5): the offer card in Free Drive, the start (a normal free race on the temporary map, so the cash goes
 * through `claimRace` in story.finish and the best time per map and weather is kept), and the results buttons
 * (back to Free Drive at the start ring, race again, menu). One call from freeDriveSetup.
 */
export function installCityRaces(d: { engine: Engine; game: Game; store: SaveStore; hideResults: () => void; enterRoam: () => void; toMenu: () => void }): { start(r: CityRace, field?: FieldEntry[]): void } {
  const { game, store } = d;
  let offered: CityRace | null = null, lastField: FieldEntry[] | null = null;

  /** `field`: the rivals (an outrun passes its one challenger); drift runs have none. */
  const start = (r: CityRace, given?: FieldEntry[]): void => {
    offer.hide();
    offered = null;
    const car = findCar(store.data.selected), w = game.weather;
    lastField = given ?? null;
    const field = given ?? (r.kind === 'drift' ? [] : competitiveField(RIVALS, car, store.data.upgrades[car.id] ?? {})); // same tier, full skill, your upgrades
    game.startRace({ car, paint: store.data.paint[car.id] ?? car.color, glow: store.data.glow[car.id], weather: w, laps: r.def.laps, trackId: r.id, cinematic: false, flyby: store.data.settings.raceIntro, agents: field, meta: { rivalIds: field.map((f) => f.agent.id), skillScale: 1, wet: w !== 'CLEAR', eventId: null, level: AI_SETTING.level } });
  };
  const offer = cityRaceOffer(() => { if (offered && game.state === 'FREEROAM' && !game.paused) start(offered); });

  CITY_HOOK.offer = (r) => {
    offered = r;
    if (!r) { offer.hide(); return; }
    const best = store.data.trackBest[`${r.id}:${game.weather}`];
    const info = t('city.info', { laps: r.def.laps, km: (r.length / 1000).toFixed(1), n: RIVALS }) + (best ? ` · ${t('city.best', { time: mmss(best) })}` : '');
    offer.show(r.def.name, info);
  };
  // left Free Drive: hide the card (a pause keeps it; Enter is ignored while paused)
  d.engine.onFrame(() => { if (offer.shown && game.state !== 'FREEROAM') offer.hide(); });

  CITY_HOOK.result = (res, id) => {
    const race = findCityEvent(id); // planned when Free Drive built the city, or rebuilt from the id on a restore
    const name = tx(race?.def.name ?? id), won = race?.kind === 'drift' ? res.driftScore >= (race.def.driftTarget ?? 0) : res.position === 1;
    if (won) markVisit(store, `win:${id}`);
    const again = (): void => { if (race) start(race, race.kind === 'run' ? lastField ?? undefined : undefined); };
    return {
      objective: race?.kind === 'drift' ? t('free.drift', { score: res.driftScore.toLocaleString(), target: (race.def.driftTarget ?? 0).toLocaleString() }) : res.position === 1 ? t('city.won', { name }) : t('city.place', { name, pos: res.position }),
      passed: won,
      buttons: [
        { label: t('city.back'), hot: true, action: () => { d.hideResults(); d.enterRoam(); } },
        { label: t('res.again'), action: again },
        { label: t('common.menu'), action: d.toMenu },
      ],
    };
  };
  return { start };
}
