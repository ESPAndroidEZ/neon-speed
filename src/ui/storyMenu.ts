import { chapter3Open, chapter4Open, chapter5Open, isUnlocked, type CareerState } from '../core/career';
import type { SaveStore } from '../core/save';
import { findCar } from '../data/cars';
import { findRival } from '../data/rivals';
import { CHAPTER, ENDING, type StoryEvent } from '../data/story';
import { CHAPTER_2, EPILOGUE, EVERY_EVENT, eventsOf } from '../data/story2';
import { CHAPTER_3, EPILOGUE_3 } from '../data/story3';
import { CHAPTER_4, EPILOGUE_4 } from '../data/story4';
import { CHAPTER_5, EPILOGUE_5 } from '../data/story5';
import { findTrackDef } from '../data/tracks';
import { button, h } from './uiKit';
import { ICONS } from './icons';
import { t, tx } from '../i18n';

export interface StoryMenuDeps {
  store: SaveStore;
  start: (ev: StoryEvent) => void;
  onBack: () => void;
}

function eventCard(ev: StoryEvent, n: number, career: CareerState, start: (ev: StoryEvent) => void): HTMLElement {
  const done = career.completed.includes(ev.id);
  const open = isUnlocked(career, ev.id);
  const card = h('div', open ? 'rb-card rb-pick' : 'rb-card');
  card.style.cssText += `;width:min(250px,86vw);text-align:left;opacity:${open ? 1 : 0.5};${open && !done ? 'border-color:#ff2a9d;box-shadow:0 0 22px #ff2a9d55' : ''}`;
  const car = ev.carId ? findCar(ev.carId) : null;
  const rivals = ev.rivals.length ? ev.rivals.map((r) => findRival(r).name).join(', ') : t('story.noRivals');
  const tag = done ? 'var(--green)' : open ? 'var(--magenta)' : 'var(--text-faint)';
  card.innerHTML = `<div class="rb-sub" style="color:${tag};font-weight:800">${open ? '' : ICONS.lock + ' '}${n}. ${t(done ? 'story.passed' : open ? 'story.next' : 'story.locked')}${ev.trackId ? ` · ${findTrackDef(ev.trackId).name}` : ''}</div>
    <div style="font-size:20px;font-weight:900;margin:4px 0">${tx(ev.title)}</div>
    <div style="opacity:.85;font-size:14px;line-height:1.35">${tx(ev.blurb)}</div>
    <div class="rb-sub" style="margin-top:8px">${t(`weather.${ev.weather}`)}${ev.weatherChange ? ` → ${t(`weather.${ev.weatherChange.to}`)}` : ''} · ${ev.laps === 1 ? t('story.oneRun') : t('story.laps', { n: ev.laps })}${car ? ` · ${t('story.only', { car: car.name })}` : ''}</div>
    <div class="rb-sub">${t('story.vs', { rivals })}</div>`;
  if (open) {
    card.tabIndex = 0;
    card.addEventListener('click', () => start(ev));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') start(ev); });
  }
  return card;
}

/** Story screen: chapters 1 to 3 with status, conditions and rivals. Only unlocked events can be started. */
export function buildStoryMenu(d: StoryMenuDeps): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.overflow = 'auto';
  root.style.justifyContent = 'flex-start';
  root.style.padding = 'max(20px,4vh) 16px';
  const career = d.store.data.career;
  let n = 0;
  for (const [ch, title, tag] of [[1, CHAPTER.title, CHAPTER.tagline], [2, CHAPTER_2.title, CHAPTER_2.tagline], [3, CHAPTER_3.title, CHAPTER_3.tagline], [4, CHAPTER_4.title, CHAPTER_4.tagline], [5, CHAPTER_5.title, CHAPTER_5.tagline]] as const) {
    const events = eventsOf(ch);
    if (ch === 2 && !career.completed.includes('finale')) {
      root.append(h('div', 'rb-sub', t('story.chapterTitle', { n: 2, title: tx(title) })), h('div', 'rb-sub', t('story.needCh1')));
      break;
    }
    if (ch === 3 && !chapter3Open(career)) {
      root.append(h('div', 'rb-sub', t('story.chapterTitle', { n: 3, title: tx(title) })), h('div', 'rb-sub', t('story.needCh2')));
      break;
    }
    if (ch === 4 && !chapter4Open(career)) {
      root.append(h('div', 'rb-sub', t('story.chapterTitle', { n: 4, title: tx(title) })), h('div', 'rb-sub', t('story.needCh3')));
      break;
    }
    if (ch === 5 && !chapter5Open(career)) {
      root.append(h('div', 'rb-sub', t('story.chapterTitle', { n: 5, title: tx(title) })), h('div', 'rb-sub', t('story.needCh4')));
      break;
    }
    root.append(h('div', 'rb-sub', t('story.chapter', { n: ch })), h('h2', 'rb-title', tx(title).toUpperCase()), h('div', 'rb-sub', tx(tag)));
    const row = h('div', 'rb-row');
    row.style.alignItems = 'stretch';
    for (const ev of events) row.append(eventCard(ev, ++n, career, d.start));
    root.append(row);
  }
  if (career.completed.length === EVERY_EVENT.length) root.append(h('div', 'rb-sub', t('story.complete')));
  root.append(button(t('common.back'), d.onBack));
  return root;
}

/** End-of-chapter card: chapter 1 opens chapter 2; chapter 2 follows the choice made at the Council. */
export function buildEnding(career: CareerState, chapter: number, onMenu: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  const card = chapter === 5 ? EPILOGUE_5[career.flags.deal ? 'deal' : 'public'] : chapter === 4 ? EPILOGUE_4 : chapter === 3 ? EPILOGUE_3[career.flags.deal ? 'deal' : 'public'] : chapter === 2 ? EPILOGUE[career.flags.sponsor ? 'sponsor' : 'open'] : ENDING;
  root.append(h('div', 'rb-sub', t('story.chapterDone', { n: chapter })), h('h1', 'rb-title', tx(card.title).toUpperCase()), h('div', '', tx(card.text)));
  const credits = 'credits' in card ? (card.credits as string[]) : [];
  if (credits.length) {
    const cr = h('div', 'rb-sub', credits.map((c, i) => `<div style="margin-top:${i ? 4 : 18}px;${i ? '' : 'font-weight:900;letter-spacing:6px;font-size:20px'}">${tx(c)}</div>`).join(''));
    root.append(cr);
  }
  root.append(button(t('common.menu'), onMenu, 'hot'));
  return root;
}
