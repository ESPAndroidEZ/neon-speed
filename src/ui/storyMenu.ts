import { isUnlocked } from '../core/career';
import type { SaveStore } from '../core/save';
import { findCar } from '../data/cars';
import { findRival } from '../data/rivals';
import { CHAPTER, ENDING, EVENTS, type StoryEvent } from '../data/story';
import { button, h } from './uiKit';

export interface StoryMenuDeps {
  store: SaveStore;
  start: (ev: StoryEvent) => void;
  onBack: () => void;
}

const WEATHER_LABEL = { CLEAR: 'Dry', RAIN: 'Rain', SNOW: 'Snow' } as const;

/** Chapter screen: the four events with status, conditions and rivals. Only unlocked events can be started. */
export function buildStoryMenu(d: StoryMenuDeps): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.overflow = 'auto';
  root.style.justifyContent = 'flex-start';
  root.style.padding = 'max(20px,4vh) 16px';
  root.append(h('div', 'rb-sub', `Chapter ${CHAPTER.id}`), h('h2', 'rb-title', CHAPTER.title.toUpperCase()), h('div', 'rb-sub', CHAPTER.tagline));
  const career = d.store.data.career;
  const row = h('div', 'rb-row');
  row.style.alignItems = 'stretch';
  EVENTS.forEach((ev, i) => {
    const done = career.completed.includes(ev.id);
    const open = isUnlocked(career, ev.id);
    const card = h('div', 'rb-card');
    card.style.cssText += `;width:min(250px,86vw);text-align:left;opacity:${open ? 1 : 0.45};${open && !done ? 'border-color:#ff2a9d;box-shadow:0 0 22px #ff2a9d55' : ''}`;
    const car = ev.carId ? findCar(ev.carId) : null;
    const rivals = ev.rivals.length ? ev.rivals.map((r) => findRival(r).name).join(', ') : 'No rivals: score alone';
    card.innerHTML = `<div class="rb-sub">${i + 1}. ${done ? 'passed' : open ? 'next' : 'locked'}</div>
      <div style="font-size:20px;font-weight:900;margin:4px 0">${ev.title}</div>
      <div style="opacity:.85;font-size:14px;line-height:1.35">${ev.blurb}</div>
      <div class="rb-sub" style="margin-top:8px">${WEATHER_LABEL[ev.weather]}${ev.weatherChange ? ` → ${WEATHER_LABEL[ev.weatherChange.to]}` : ''} · ${ev.laps} laps${car ? ` · ${car.name} only` : ''}</div>
      <div class="rb-sub">vs ${rivals}</div>`;
    if (open) card.addEventListener('click', () => d.start(ev));
    row.append(card);
  });
  root.append(row);
  if (career.completed.length === EVENTS.length) root.append(h('div', 'rb-sub', 'Chapter complete. Replay any event.'));
  root.append(button('Back', d.onBack));
  return root;
}

/** End-of-chapter card. */
export function buildEnding(onMenu: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.append(h('div', 'rb-sub', 'Chapter 1 complete'), h('h1', 'rb-title', ENDING.title.toUpperCase()), h('div', '', ENDING.text), h('div', 'rb-sub', ENDING.link), button('Menu', onMenu, 'hot'));
  return root;
}
