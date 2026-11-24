import type { SaveStore } from '../core/save';
import type { TrackDef } from '../data/tracks';
import { WEATHER } from '../physics/weather';
import type { Weather } from '../types/game';
import { button, h, lapText } from './uiKit';
import { t } from '../i18n';

/** After a map is picked: how many rivals (circuits) and the weather. `pick` remembers the rival count between maps; `start` launches the race. */
export function buildWeatherPick(d: { def: TrackDef; store: SaveStore; rivals: number; pick: (n: number) => void; start: (w: Weather, rivals: number, trackId: string) => void; onBack: () => void }): HTMLElement {
  const { def, store, start, onBack, pick } = d;
  let rivals = d.rivals;
  const el = h('div', 'rb-layer dim');
  el.append(h('h2', 'rb-title', def.name.toUpperCase()));
  const riv = h('div', 'rb-row');
  const setRivals = (n: number): void => {
    rivals = n; pick(n);
    riv.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.n === String(n)));
  };
  for (const [n, label] of [[0, 'menu.timeTrial'], [3, 'menu.rivals3'], [5, 'menu.rivals5'], [-5, 'menu.knockout']] as const) {
    const b = button(t(label), () => setRivals(n));
    b.dataset.n = String(n);
    b.style.minWidth = '130px';
    riv.append(b);
  }
  if (def.type === 'circuit') el.append(riv);
  setRivals(rivals);
  const row = h('div', 'rb-row');
  for (const w of ['CLEAR', 'RAIN', 'SNOW'] as Weather[]) {
    const card = h('div', 'rb-card rb-pick', `<div style="font-size:26px;font-weight:900">${t(`weather.${w}`)}</div><div style="opacity:.8;margin:6px 0">${t(`weather.${w}.blurb`)}</div><div class="rb-sub">${t('menu.grip', { n: Math.round(WEATHER[w].grip * 100) })}<br>${t('menu.best')} ${lapText(store.data.trackBest[`${def.id}:${w}`] ?? null)}</div>`);
    card.addEventListener('click', () => start(w, def.type === 'circuit' ? rivals : 0, def.id));
    card.tabIndex = 0;
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') card.click(); });
    if (def.recommendedWeather.includes(w)) card.style.borderColor = '#ff2a9d';
    row.append(card);
  }
  el.append(row, h('div', 'rb-sub', t('menu.pink')), button(t('common.back'), onBack));
  return el;
}
