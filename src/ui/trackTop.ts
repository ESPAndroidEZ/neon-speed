import type { LbBoard } from '../core/leaderboard';
import type { SaveStore } from '../core/save';
import type { TrackDef } from '../data/tracks';
import { isCityTrack } from '../core/cityRace';
import { boardKey } from '../core/leaderboard';
import { CARS } from '../data/cars';
import { carTier } from '../data/rivals';
import { leaderboard } from '../game/leaderboardHook';
import { t } from '../i18n';

const lap = (ms: number): string => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(2).padStart(5, '0')}`;

/** Board shown on a map card: clear weather, the selected car's tier. Null for drift maps (scored by points). */
export function trackBoardKey(def: TrackDef, store: SaveStore): string | null {
  const car = CARS.find((c) => c.id === store.data.selected);
  return def.type === 'drift' || !car || isCityTrack(def.id) ? null : boardKey(def.id, 'CLEAR', store.data.settings.weatherPhysics, carTier(car));
}

/** "Online top 3: 1. Nia 0:58.31 · 2. ..." as plain text (names are player input: always set with textContent). */
export function topLine(b: LbBoard | undefined): string {
  if (!b || b.top.length === 0) return t('lb.none');
  return `${t('lb.top')}: ${b.top.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} ${lap(r.ms)}`).join(' · ')} · ${t('lb.unverified')}`;
}

/** Fill every `[data-lb]` element under root with its board's top 3 (one request; silent when offline). */
export function fillTrackTops(root: HTMLElement): void {
  const lb = leaderboard();
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-lb]'));
  if (!lb || els.length === 0) return;
  void lb.tops(els.map((e) => e.dataset.lb ?? ''), 3).then((boards) => {
    if (!boards) return;
    for (const el of els) el.textContent = topLine(boards[el.dataset.lb ?? '']);
  });
}
