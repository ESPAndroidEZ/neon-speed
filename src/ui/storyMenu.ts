import { isUnlocked, type CareerState } from '../core/career';
import type { SaveStore } from '../core/save';
import { findCar } from '../data/cars';
import { findRival } from '../data/rivals';
import { CHAPTER, ENDING, type StoryEvent } from '../data/story';
import { ALL_EVENTS, CHAPTER_2, EPILOGUE, eventsOf } from '../data/story2';
import { findTrackDef } from '../data/tracks';
import { button, h } from './uiKit';

export interface StoryMenuDeps {
  store: SaveStore;
  start: (ev: StoryEvent) => void;
  onBack: () => void;
}

const WEATHER_LABEL = { CLEAR: 'Dry', RAIN: 'Rain', SNOW: 'Snow' } as const;

function eventCard(ev: StoryEvent, n: number, career: CareerState, start: (ev: StoryEvent) => void): HTMLElement {
  const done = career.completed.includes(ev.id);
  const open = isUnlocked(career, ev.id);
  const card = h('div', 'rb-card');
  card.style.cssText += `;width:min(250px,86vw);text-align:left;opacity:${open ? 1 : 0.45};${open && !done ? 'border-color:#ff2a9d;box-shadow:0 0 22px #ff2a9d55' : ''}`;
  const car = ev.carId ? findCar(ev.carId) : null;
  const rivals = ev.rivals.length ? ev.rivals.map((r) => findRival(r).name).join(', ') : 'No rivals: score alone';
  card.innerHTML = `<div class="rb-sub">${n}. ${done ? 'passed' : open ? 'next' : 'locked'}${ev.trackId ? ` · ${findTrackDef(ev.trackId).name}` : ''}</div>
    <div style="font-size:20px;font-weight:900;margin:4px 0">${ev.title}</div>
    <div style="opacity:.85;font-size:14px;line-height:1.35">${ev.blurb}</div>
    <div class="rb-sub" style="margin-top:8px">${WEATHER_LABEL[ev.weather]}${ev.weatherChange ? ` → ${WEATHER_LABEL[ev.weatherChange.to]}` : ''} · ${ev.laps === 1 ? 'one run' : `${ev.laps} laps`}${car ? ` · ${car.name} only` : ''}</div>
    <div class="rb-sub">vs ${rivals}</div>`;
  if (open) card.addEventListener('click', () => start(ev));
  return card;
}

/** Story screen: chapter 1 and chapter 2 with status, conditions and rivals. Only unlocked events can be started. */
export function buildStoryMenu(d: StoryMenuDeps): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.overflow = 'auto';
  root.style.justifyContent = 'flex-start';
  root.style.padding = 'max(20px,4vh) 16px';
  const career = d.store.data.career;
  let n = 0;
  for (const [ch, title, tag] of [[1, CHAPTER.title, CHAPTER.tagline], [2, CHAPTER_2.title, CHAPTER_2.tagline]] as const) {
    const events = eventsOf(ch);
    if (ch === 2 && !career.completed.includes('finale')) {
      root.append(h('div', 'rb-sub', `Chapter 2 · ${title}`), h('div', 'rb-sub', 'Finish Chapter 1 to open it.'));
      break;
    }
    root.append(h('div', 'rb-sub', `Chapter ${ch}`), h('h2', 'rb-title', title.toUpperCase()), h('div', 'rb-sub', tag));
    const row = h('div', 'rb-row');
    row.style.alignItems = 'stretch';
    for (const ev of events) row.append(eventCard(ev, ++n, career, d.start));
    root.append(row);
  }
  if (career.completed.length === ALL_EVENTS.length) root.append(h('div', 'rb-sub', 'Story complete. Replay any event.'));
  root.append(button('Back', d.onBack));
  return root;
}

/** End-of-chapter card: chapter 1 opens chapter 2; chapter 2 follows the choice made at the Council. */
export function buildEnding(career: CareerState, chapter: number, onMenu: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  const card = chapter === 2 ? EPILOGUE[career.flags.sponsor ? 'sponsor' : 'open'] : ENDING;
  root.append(h('div', 'rb-sub', `Chapter ${chapter} complete`), h('h1', 'rb-title', card.title.toUpperCase()), h('div', '', card.text), button('Menu', onMenu, 'hot'));
  return root;
}
