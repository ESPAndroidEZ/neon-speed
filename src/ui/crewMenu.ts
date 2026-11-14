import { CREW } from '../data/lore';
import type { SaveStore } from '../core/save';
import { drawWall } from '../world/wallArt';
import { button, h } from './uiKit';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Crew screen: bios (with the spoiler gate on Cain and DJ Switch) and the Red Hand Wall. */
export function buildCrewMenu(store: SaveStore, onBack: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(18px,3vh) 16px';
  root.append(h('h2', 'rb-title', 'THE CREW'));
  const career = store.data.career;
  const wall = document.createElement('canvas');
  wall.width = 960;
  wall.height = 300;
  wall.style.cssText = 'width:min(900px,94vw);border-radius:8px;border:1px solid #d4141c88;box-shadow:0 0 24px #d4141c44';
  drawWall(wall, career.completed.length);
  root.append(h('div', 'rb-sub', 'The Red Hand Wall'), wall);
  const grid = h('div', 'rb-row');
  grid.style.alignItems = 'stretch';
  for (const c of CREW) {
    const card = h('div', 'rb-card');
    card.style.cssText += `;cursor:default;width:min(270px,88vw);text-align:left;border-color:${hex(c.color)}66`;
    const bio = career.endingSeen && c.revealed ? c.revealed : c.bio;
    card.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><div style="width:40px;height:40px;border-radius:50%;background:${hex(c.color)};color:#05060d;font-weight:900;font-size:20px;display:flex;align-items:center;justify-content:center">${c.name[0]}</div><div><div style="font-weight:900">${career.endingSeen && c.id === 'switch' ? 'DJ Switch (Cain)' : c.name}</div><div class="rb-sub">${c.role}</div></div></div><div style="margin-top:8px;font-size:14px;line-height:1.4;opacity:.9">${bio}</div>`;
    grid.append(card);
  }
  root.append(grid, button('Back', onBack));
  return root;
}
