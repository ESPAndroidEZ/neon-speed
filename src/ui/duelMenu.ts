import type { SaveStore } from '../core/save';
import { duelFlag, duelsFor, type Duel } from '../core/duels';
import { repLevel } from '../core/rep';
import { findCar } from '../data/cars';
import { RIVALS, findRival } from '../data/rivals';
import { findTrackDef } from '../data/tracks';
import { portraitEl } from './portraits';
import { button, h, money } from './uiKit';
import { t, tx } from '../i18n';

/** Rival duels (docs/nfs-vision.md): one card per rival with their car, map and weather; a first win takes their car and pays cash. */
export function buildDuelMenu(d: { store: SaveStore; start: (duel: Duel) => void; onBack: () => void }): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(16px,3vh) 16px';
  root.append(h('h2', 'rb-title', t('duel.title')), h('div', 'rb-sub', t('duel.hint')));
  const level = repLevel(d.store.data.rep ?? 0);
  const row = h('div', 'rb-row');
  row.style.alignItems = 'stretch';
  for (const du of duelsFor(RIVALS)) {
    const rv = findRival(du.rival), car = findCar(rv.carId), done = !!d.store.data.career.flags[duelFlag(rv.id)], locked = level < du.level;
    const card = h('div', locked ? 'rb-card' : 'rb-card rb-pick');
    card.style.cssText += ';width:min(250px,80vw);text-align:left' + (locked ? ';opacity:.7' : '');
    const top = h('div');
    top.style.cssText = 'display:flex;gap:10px;align-items:center';
    top.append(portraitEl(rv.id, 'smirk', 52), h('div', '', `<div style="font-weight:900">${rv.name}</div><div class="rb-sub" style="letter-spacing:1px">${car.brand} ${car.name}</div>`));
    const map = findTrackDef(du.trackId);
    card.append(top, h('div', '', `<div style="opacity:.85;font-size:13px;line-height:1.35;margin-top:8px">${tx(rv.bio)}</div><div class="rb-sub" style="margin-top:6px">${map.name} · ${t(`weather.${du.weather}`)}</div><div style="margin-top:6px;font-weight:800;color:${done ? 'var(--green)' : locked ? '#ff9aa8' : '#ffd27d'}">${done ? t('duel.done') : locked ? t('duel.lock', { n: du.level }) : `${t('duel.prize', { cash: money(du.cash) })}`}</div>`));
    if (!locked) {
      card.tabIndex = 0;
      card.addEventListener('click', () => d.start(du));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') d.start(du); });
    }
    row.append(card);
  }
  root.append(row, button(t('common.back'), d.onBack));
  return root;
}
