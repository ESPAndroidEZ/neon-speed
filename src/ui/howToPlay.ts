import { button, h, injectCss } from './uiKit';
import { t } from '../i18n';

const KEY = 'rb-howto';
const TITLES = ['how.t1', 'how.t2', 'how.t3', 'how.t4'] as const;
const BODIES = ['how.b1', 'how.b2', 'how.b3', 'how.b4'] as const;
const SLIDES = TITLES.length;

const seen = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true; // storage blocked: never nag
  }
};

/**
 * "How to play": four short slides (drive, the overpowered handbrake, nitro, modes). Opens by itself once per device
 * (`force` false) and any time from Crew > How to play (`force` true). Skipping or finishing marks it seen.
 */
export function showHowTo(force: boolean): void {
  if ((!force && seen()) || document.querySelector('.rb-howto')) return;
  injectCss();
  const root = h('div', 'rb-layer dim rb-howto');
  root.style.zIndex = '5000';
  const card = h('div', 'rb-panel');
  card.style.cssText += ';width:min(560px,92vw);text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center';
  let i = 1;
  const close = (): void => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* storage blocked */
    }
    root.remove();
  };
  const draw = (): void => {
    card.replaceChildren(
      h('div', 'rb-sub', t('how.step', { n: i, total: SLIDES })),
      h('h2', 'rb-title', t(TITLES[i - 1])),
      h('div', '', t(BODIES[i - 1])),
    );
    const row = h('div', 'rb-row');
    row.style.justifyContent = 'center';
    if (i < SLIDES) row.append(button(t('how.skip'), close), button(t('how.next'), () => { i++; draw(); }, 'hot'));
    else row.append(button(t('how.done'), close, 'hot'));
    card.append(row);
  };
  draw();
  root.append(card);
  document.body.append(root);
}
