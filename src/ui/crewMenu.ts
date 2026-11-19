import { CREW } from '../data/lore';
import type { SaveStore } from '../core/save';
import { drawWall } from '../world/wallArt';
import { portraitEl } from './portraits';
import { button, h } from './uiKit';
import { t, tx } from '../i18n';
import { statsCard } from './statsCard';
import { achievementsCard } from './achievementsUi';
import { showHowTo } from './howToPlay';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
/** Characters whose relationship value is shown once Chapter 2 starts. */
const REL_IDS = ['mara', 'cain', 'dante', 'nova', 'brick'];

/** A -5..+5 meter: how this person feels about you after your choices. */
function relBar(v: number): HTMLElement {
  const bar = h('div', 'rb-bar');
  bar.style.cssText += ';width:100%;margin-top:8px;position:relative';
  bar.innerHTML = `<i style="position:absolute;left:${v >= 0 ? 50 : 50 + v * 10}%;width:${Math.abs(v) * 10}%;background:${v >= 0 ? 'var(--green)' : 'var(--red)'}"></i>`;
  const wrap = h('div', '', `<div class="rb-sub" style="font-size:11px;margin-top:6px">${t('crew.relationship')}</div>`);
  wrap.append(bar);
  return wrap;
}

/** Crew screen: bios (with the spoiler gate on Cain and DJ Switch) and the Red Hand Wall. */
export function buildCrewMenu(store: SaveStore, onBack: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(18px,3vh) 16px';
  root.append(h('h2', 'rb-title', t('crew.title')));
  const career = store.data.career;
  const wall = document.createElement('canvas');
  wall.width = 960;
  wall.height = 300;
  wall.style.cssText = 'width:min(900px,94vw);border-radius:8px;border:1px solid #d4141c88;box-shadow:0 0 24px #d4141c44';
  drawWall(wall, career.completed.length);
  root.append(h('div', 'rb-sub', t('crew.wall')), wall);
  const grid = h('div', 'rb-row');
  grid.style.alignItems = 'stretch';
  for (const c of CREW) {
    const card = h('div', 'rb-card');
    card.style.cssText += `;cursor:default;width:min(270px,88vw);text-align:left;border-color:${hex(c.color)}66`;
    const bio = tx(career.epilogueSeen && c.truth ? c.truth : career.endingSeen && c.revealed ? c.revealed : c.bio);
    const rel = career.rel[c.id] ?? 0;
    const mood = rel > 0 ? 'smirk' : rel < 0 ? 'angry' : 'neutral';
    const top = h('div');
    top.style.cssText = 'display:flex;gap:10px;align-items:center';
    top.append(portraitEl(c.id, mood, 52), h('div', '', `<div style="font-weight:900">${c.id === 'rookie' ? t('crew.rookie') : c.name}</div><div class="rb-sub" style="letter-spacing:2px">${tx(c.role)}</div>`));
    card.append(top, h('div', '', `<div style="opacity:.85;font-size:14px;line-height:1.4;margin-top:8px">${bio}</div>`));
    if (REL_IDS.includes(c.id) && career.completed.includes('c2-redline')) card.append(relBar(rel));
    grid.append(card);
  }
  root.append(grid, statsCard(), achievementsCard(), button(t('how.open'), () => showHowTo(true)), button(t('common.back'), onBack));
  return root;
}
