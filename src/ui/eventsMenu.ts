import type { SaveStore } from '../core/save';
import type { CityKind, CityRace } from '../core/cityRace';
import { areaOpen, AREA_REP } from '../core/areaLocks';
import { repLevel } from '../core/rep';
import { GLYPH, MK, type MarkerKind } from './roamFullMap';
import { button, h } from './uiKit';
import { t, tx } from '../i18n';
import type { StringKey } from '../i18n';

/** What the street-events screen needs (wired by game/freeDriveSetup once Free Drive is installed). */
export interface EventsDeps { list: () => CityRace[]; start: (r: CityRace) => void; driveTo: (r: CityRace) => void }
let deps: EventsDeps | null = null;
export const setEvents = (d: EventsDeps): void => { deps = d; };

const TABS: readonly CityKind[] = ['circuit', 'sprint', 'drift', 'drag'];
const MARK: Record<CityKind, MarkerKind> = { circuit: 'race', sprint: 'sprint', drift: 'drift', drag: 'drag', run: 'run' };
const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, '0')}`;

/**
 * Street events (Underground round, stage 4): every city event by type in the menu style (tabs, cards with the map icon),
 * with Race (start now) and Drive there (Free Drive with the GPS set). Districts not open yet show their REP level.
 * An overlay over the main menu: Back removes it.
 */
export function openEvents(store: SaveStore): void {
  if (!deps) return;
  const d = deps, level = repLevel(store.data.rep ?? 0), all = d.list();
  const root = h('div', 'rb-layer dim rb-events');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(16px,3vh) 16px;z-index:30';
  const bar = h('div', 'rb-tabbar'), grid = h('div', 'rb-row');
  grid.style.cssText += ';align-items:stretch;justify-content:center';
  const close = (): void => { root.remove(); window.removeEventListener('keydown', onKey, true); };
  const onKey = (e: KeyboardEvent): void => { if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const show = (kind: CityKind): void => {
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.k === kind));
    grid.replaceChildren();
    for (const r of all.filter((e) => e.kind === kind)) {
      const open = areaOpen(r.district, level), won = store.data.roam?.visited.includes(`win:${r.id}`) ?? false;
      const best = kind === 'drift' ? store.data.trackBest[`${r.id}:drift`] : store.data.trackBest[`${r.id}:CLEAR`];
      const km = (((r.def.sprintEnd ?? 1) * r.length * (kind === 'circuit' || kind === 'drift' ? r.def.laps : 1)) / 1000).toFixed(1);
      const card = h('div', 'rb-card');
      card.style.cssText += `;width:min(260px,86vw);text-align:left;display:flex;flex-direction:column;gap:6px;${open ? '' : 'opacity:.55'}`;
      const badge = `<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${MK[MARK[kind]]};color:#05060d;font:800 14px system-ui;margin-right:8px">${GLYPH[MARK[kind]] ?? ''}</span>`;
      card.append(h('div', '', `<div style="display:flex;align-items:center;font-size:19px;font-weight:900">${badge}${tx(r.def.name)}${won ? ' <span style="color:#3ddc97;margin-left:6px">✓</span>' : ''}</div>
        <div class="rb-sub">${t(`district.${r.district}` as StringKey)} · ${km} km${kind === 'drift' ? ` · ${t('ev.target', { n: (r.def.driftTarget ?? 0).toLocaleString() })}` : ''}</div>
        <div style="font-size:12px;opacity:.8">${best ? t('ev.best', { v: kind === 'drift' ? best.toLocaleString() : mmss(best) }) : t('ev.new')}</div>`));
      if (!open) card.append(h('div', 'rb-note', t('area.locked', { d: t(`district.${r.district}` as StringKey), n: AREA_REP[r.district] })));
      else {
        const row = h('div', 'rb-row');
        row.append(button(t('city.race'), () => { close(); d.start(r); }, 'hot'), button(t('ev.drive'), () => { close(); d.driveTo(r); }));
        card.append(row);
      }
      grid.append(card);
    }
  };
  for (const k of TABS) { const b = button(t(`ev.${k}`), () => show(k)); b.dataset.k = k; bar.append(b); }
  root.append(h('h2', 'rb-title', t('ev.title')), h('div', 'rb-sub', t('ev.hint')), bar, grid, button(t('common.back'), close));
  document.body.appendChild(root);
  window.addEventListener('keydown', onKey, true);
  show('circuit');
}

/** Main-menu button for the street events screen. */
export const eventsButton = (store: SaveStore): HTMLButtonElement => button(t('ev.title'), () => openEvents(store));
