import { t, tx } from '../i18n';
import { button, h } from './uiKit';

export interface CityRaceOffer { show(name: string, info: string): void; hide(): void; readonly shown: boolean }

/**
 * The race offer in Free Drive (W5.5): a small card under the top bar when the car stops in a gold start ring.
 * Race button for phones, Enter on a keyboard. `start` is called once per tap or key press.
 */
export function cityRaceOffer(start: () => void): CityRaceOffer {
  const root = h('div', 'rb-panel rb-city-offer');
  root.style.cssText = 'position:fixed;top:calc(max(10px,env(safe-area-inset-top)) + 52px);left:50%;transform:translateX(-50%);z-index:12;display:none;align-items:center;gap:12px;padding:10px 14px;max-width:calc(100vw - 32px);font:600 14px system-ui,sans-serif;color:#ffe2a8;border:1px solid #ffb02088';
  const text = h('div', '');
  const title = h('div', '');
  title.style.cssText = 'font-weight:900;font-size:15px;color:#ffd27d';
  const sub = h('div', 'rb-sub');
  text.append(title, sub);
  const go = button(t('city.race'), () => { if (on) start(); }, 'hot');
  go.style.cssText += ';min-width:0;padding:8px 16px';
  const key = h('span', 'rb-sub', t('city.key'));
  key.style.opacity = '.7';
  root.append(text, go, key);
  document.body.appendChild(root);
  let on = false;
  window.addEventListener('keydown', (e) => {
    if (on && !e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) { e.preventDefault(); start(); }
  });
  return {
    show: (name, info) => { title.textContent = t('city.offer', { name: tx(name) }); sub.textContent = info; on = true; root.style.display = 'flex'; },
    hide: () => { if (!on) return; on = false; root.style.display = 'none'; },
    get shown() { return on; },
  };
}
