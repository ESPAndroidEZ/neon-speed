import { injectRoamCss } from './roamCss';
import { portraitEl } from './portraits';
import { button, h } from './uiKit';
import { t } from '../i18n';

export interface OfferInfo { who: string; kicker: string; title: string; person: string; intro: string; replay: boolean }
export interface StoryOffer { show(a: OfferInfo): void; hide(): void; readonly shown: boolean }

/**
 * The story offer in Free Drive: a card with the portrait of the person waiting at the ring, the chapter, the event and
 * (the first time you meet them) a one-line introduction. START for phones, Enter on a keyboard; `start` runs once per press.
 */
export function storyOffer(start: () => void): StoryOffer {
  injectRoamCss();
  const root = h('div', 'rb-panel rb-city-offer rb-story-offer');
  const face = h('div', 'rb-pt');
  const text = h('div', '');
  const k = h('div', 'rb-sub rb-st-k'), title = h('div', 'rb-ot'), who = h('div', 'rb-sub rb-st-w'), intro = h('div', 'rb-st-i');
  text.append(k, title, who, intro);
  const go = button(t('pin.start'), () => { if (on) start(); }, 'hot');
  const key = h('span', 'rb-sub', t('city.key'));
  root.append(face, text, go, key);
  document.body.appendChild(root);
  let on = false;
  window.addEventListener('keydown', (e) => {
    if (on && !e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) { e.preventDefault(); start(); }
  });
  return {
    show: (a) => {
      face.replaceChildren(portraitEl(a.who, 'neutral', 56));
      k.textContent = a.kicker; title.textContent = a.title; who.textContent = a.person; intro.textContent = a.intro;
      intro.style.display = a.intro ? '' : 'none';
      go.textContent = t(a.replay ? 'pin.replay' : 'pin.start');
      on = true; root.style.display = 'flex'; document.body.classList.add('rb-offer');
    },
    hide: () => { if (!on) return; on = false; root.style.display = 'none'; document.body.classList.remove('rb-offer'); },
    get shown() { return on; },
  };
}

export interface StoryCall { show(who: string, name: string, line: string): void; hide(): void; dispose(): void }

/** A phone call from the next person on the story (portrait, name, one line); it fades after a few seconds. */
export function storyCall(): StoryCall {
  injectRoamCss();
  const root = h('div', 'rb-call');
  document.body.appendChild(root);
  let timer = 0;
  const hide = (): void => { clearTimeout(timer); root.style.display = 'none'; document.body.classList.remove('rb-calling'); };
  return {
    show(who, name, line) {
      const text = h('div', '');
      text.append(h('div', 'rb-ot', name), h('div', 'rb-sub', line));
      root.replaceChildren(portraitEl(who, 'neutral', 44), text);
      root.style.display = 'flex'; document.body.classList.add('rb-calling');
      clearTimeout(timer);
      timer = window.setTimeout(hide, 7000);
    },
    hide,
    dispose() { hide(); root.remove(); },
  };
}
