import { injectRoamCss } from './roamCss';
import { t, tx } from '../i18n';
import { button, h } from './uiKit';

export interface CityRaceOffer { show(name: string, info: string, kind?: string): void; hide(): void; readonly shown: boolean }

/**
 * The race offer in Free Drive (W5.5): a small card under the top bar when the car stops in a gold start ring.
 * Race button for phones, Enter on a keyboard. `start` is called once per tap or key press.
 */
export function cityRaceOffer(start: () => void): CityRaceOffer {
  injectRoamCss();
  const root = h('div', 'rb-panel rb-city-offer');
  const text = h('div', '');
  const title = h('div', '');
  title.className = 'rb-ot';
  const sub = h('div', 'rb-sub');
  text.append(title, sub);
  const go = button(t('city.race'), () => { if (on) start(); }, 'hot');
  const key = h('span', 'rb-sub', t('city.key'));
  root.append(text, go, key);
  document.body.appendChild(root);
  let on = false;
  window.addEventListener('keydown', (e) => {
    if (on && !e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) { e.preventDefault(); start(); }
  });
  return {
    show: (name, info, kind) => { title.textContent = kind ? `${kind.toUpperCase()} · ${tx(name)}` : t('city.offer', { name: tx(name) }); sub.textContent = info; on = true; root.style.display = 'flex'; document.body.classList.add('rb-offer'); },
    hide: () => { if (!on) return; on = false; root.style.display = 'none'; document.body.classList.remove('rb-offer'); },
    get shown() { return on; },
  };
}
