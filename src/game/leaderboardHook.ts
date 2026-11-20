import type { Engine } from '../core/engine';
import type { Game } from './game';
import type { RaceResult } from '../core/raceManager';
import type { SaveStore } from '../core/save';
import type { TrackDef } from '../data/tracks';
import type { Weather } from '../types/game';
import { Leaderboard, boardKey, dailyKey, type LbResult } from '../core/leaderboard';
import { getSync } from '../core/serverSync';
import { CARS } from '../data/cars';
import { carTier } from '../data/rivals';
import { dailyChallenge, dayNumber } from '../data/dailyChallenge';
import { LapFrames, bestLapOf } from './lapFrames';
import { t } from '../i18n';

const frames = new LapFrames();
let board: Leaderboard | null = null;

/** The shared board client (null without server sync: the native app, or before boot ran). */
export function leaderboard(): Leaderboard | null {
  const sync = getSync();
  if (!board && sync && typeof localStorage !== 'undefined') {
    const url = ((import.meta.env.VITE_API_URL as string | undefined) ?? './api/storage.php').replace(/storage\.php$/, 'scores.php');
    board = new Leaderboard(url, () => sync.code(), (u, i) => fetch(u, i), localStorage);
    window.addEventListener('online', () => void board?.flush());
  }
  return board;
}

/** Records the player's position at 10 Hz of race time for every race (no allocation per frame). */
export function installLapFrames(engine: Engine, game: Game): void {
  let setupRef: unknown = null, last = -1;
  engine.onFrame(() => {
    const rm = game.rm;
    if (!game.setup || (rm.phase !== 'RACING' && rm.phase !== 'FINISHED')) return;
    if (game.setup !== setupRef || rm.raceTime < last) { setupRef = game.setup; frames.reset(); } // new race or restart
    last = rm.raceTime;
    const s = game.player.car.state; // after the line too: the lap that just ended may still miss its last sample
    frames.record(rm.raceTime, s.position.x, s.position.y, s.position.z, s.heading);
  });
  setTimeout(() => void leaderboard()?.flush(), 8000); // something left from an offline race
}

/** Free race finished: send the best lap to its board (and today's daily board) and fill the results line. */
export function submitLapBoard(store: SaveStore, def: TrackDef, weather: Weather, r: RaceResult): void {
  const lb = leaderboard(), s = store.data.settings, laps = r.lapTimes ?? [];
  if (!lb || def.type === 'drift' || s.assist === 'BEGINNER' || laps.length === 0) return; // beginner assists brake and steer for you
  const best = bestLapOf(laps), lap = laps[best.index];
  const f = frames.slice(best.start, best.start + lap);
  const spec = CARS.find((c) => c.id === store.data.selected);
  if (!spec || f.length < 32) return;
  const ms = Math.round(lap * 1000);
  const name = (localStorage.getItem('ns-online-name') ?? '').slice(0, 16) || undefined;
  const key = boardKey(def.id, weather, s.weatherPhysics, carTier(spec));
  const daily = dailyChallenge(dayNumber(new Date()));
  if (daily.trackId === def.id && daily.weather === weather) void lb.submit({ board: dailyKey(daily.day, def.id, weather, s.weatherPhysics), ms, car: spec.id, f, name });
  void lb.submit({ board: key, ms, car: spec.id, f, name }).then(show);
}

/** One line under the results: "Online board: #3 of 41 · unverified times". */
export function boardLine(res: LbResult): string {
  if (res.state === 'queued') return t('lb.queued');
  if (res.state === 'rejected') return t('lb.rejected');
  return res.rank === null ? t('lb.queued') : `${t('lb.rank', { rank: res.rank, of: res.of })}${res.improved ? ` · ${t('lb.new')}` : ''} · ${t('lb.unverified')}`;
}

function show(res: LbResult): void {
  const el = document.getElementById('rs-lb');
  if (el) el.textContent = boardLine(res);
}
