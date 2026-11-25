import type { DistrictId } from '../types/world';
import { DISTRICTS } from '../types/world';
import { t, type StringKey } from '../i18n';
import { photoButton, type PhotoSource } from './photo';
import { button, h } from './uiKit';

export interface RoamPause { open(): void; close(): void; readonly isOpen: boolean }

/** Free Drive pause: Resume, fast travel to a district, photo (PNG without the UI), respawn, back to the menu. */
export function roamPause(a: { time: { label: () => string; cycle: () => void }; map: () => void; resume: () => void; travel: (d: DistrictId) => void; pct: (d: DistrictId) => number; respawn: () => void; exit: () => void; photo: PhotoSource }): RoamPause {
  const root = h('div', 'rb-layer dim rb-roampause');
  root.style.cssText += ';display:none;overflow:auto;z-index:30';
  let on = false;
  const close = (): void => { on = false; root.style.display = 'none'; root.classList.remove('on'); document.body.classList.remove('rb-fdover'); };
  const go = (fn: () => void) => () => { close(); fn(); };
  const time = button(a.time.label(), () => { a.time.cycle(); time.textContent = a.time.label(); });
  const panel = h('section', 'rb-panel');
  panel.style.width = 'min(480px,94vw)';
  const places = h('div', 'rb-row'), labels: [DistrictId, HTMLElement][] = [];
  places.style.cssText += ';flex-wrap:wrap;justify-content:center';
  for (const d of DISTRICTS) {
    if (d === 'bay') continue; // water
    const b = button('', go(() => a.travel(d)));
    labels.push([d, b]);
    b.style.cssText += ';min-width:0;padding:8px 12px;font-size:13px';
    places.append(b);
  }
  panel.append(h('h3', '', t('roam.travel')), places);
  root.append(h('h2', 'rb-title', t('pause.title')), button(t('pause.resume'), go(a.resume), 'hot'), button(t('roam.map'), () => { close(); a.map(); }), time, panel, photoButton(a.photo), button(t('roam.respawn'), go(a.respawn)), button(t('common.menu'), go(a.exit)));
  document.body.appendChild(root);
  return {
    open: () => { for (const [d, b] of labels) b.textContent = `${t(`district.${d}` as StringKey)} ${a.pct(d)}%`; on = true; root.style.display = 'flex'; root.classList.add('on'); document.body.classList.add('rb-fdover'); },
    close,
    get isOpen() { return on; },
  };
}
