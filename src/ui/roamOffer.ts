import { injectRoamCss } from './roamCss';
import { button, h } from './uiKit';

export interface RoamOffer { show(title: string, info: string, action: string, keyHint: string): void; hide(): void; readonly shown: boolean }

/**
 * A small offer card under the Free Drive top bar (shops, challengers): title, one line, an action button for phones and
 * a key on a keyboard (`code`, e.g. Enter or KeyH). `go` runs once per press, only while the card shows.
 */
export function roamOffer(code: string, go: () => void, cls = ''): RoamOffer {
  injectRoamCss();
  const root = h('div', `rb-panel rb-city-offer ${cls}`);
  const text = h('div', ''), title = h('div', 'rb-ot'), sub = h('div', 'rb-sub');
  text.append(title, sub);
  const btn = button('', () => { if (on) go(); }, 'hot');
  const key = h('span', 'rb-sub');
  root.append(text, btn, key);
  document.body.appendChild(root);
  let on = false;
  window.addEventListener('keydown', (e) => {
    if (!on || e.repeat) return;
    if (e.code === code || (code === 'Enter' && e.code === 'NumpadEnter')) { e.preventDefault(); go(); }
  });
  return {
    show: (tt, info, action, hint) => { title.textContent = tt; sub.textContent = info; btn.textContent = action; key.textContent = hint; on = true; root.style.display = 'flex'; document.body.classList.add('rb-offer'); },
    hide: () => { if (!on) return; on = false; root.style.display = 'none'; document.body.classList.remove('rb-offer'); },
    get shown() { return on; },
  };
}
