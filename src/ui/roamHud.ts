import { t } from '../i18n';
import { button, h } from './uiKit';

export interface RoamHud { show(): void; hide(): void; update(live: number, pending: number): void }

/**
 * Free Drive overlay: Respawn and Pause buttons (phones have no keyboard), the key hint, and while the city streams in a
 * small "building the city" line. Keys while shown: R respawn, Esc pause / resume.
 */
export function roamHud(a: { respawn: () => void; pause: () => void }): RoamHud {
  const root = h('div', 'rb-roam');
  root.style.cssText = 'position:fixed;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);max-width:calc(100vw - 260px);justify-content:center;z-index:12;display:none;gap:8px;align-items:center;flex-wrap:wrap;font:600 13px system-ui,sans-serif;color:#cfe9ff';
  const small = (b: HTMLButtonElement): HTMLButtonElement => { b.style.cssText += ';min-width:0;padding:8px 14px;font-size:13px'; return b; };
  const status = h('span', '');
  status.style.opacity = '.8';
  root.append(small(button(t('roam.respawn'), a.respawn)), small(button(t('roam.pause'), a.pause)), h('span', 'rb-sub', t('roam.keys')), status);
  const css = document.createElement('style'); // race-only HUD parts make no sense in the city: lap, position, timer, start lights, race map
  css.textContent = 'body.rb-roaming #hud .info,body.rb-roaming #hud .lights,body.rb-roaming #minimap,body.rb-roaming #hud .tl small{display:none!important}'; // race key hints too: ours are in the bar
  document.head.appendChild(css);
  document.body.appendChild(root);
  let on = false;
  window.addEventListener('keydown', (e) => {
    if (!on || e.repeat) return;
    if (e.code === 'KeyR') a.respawn();
    else if (e.code === 'Escape') a.pause(); // toggles: the pause menu closes itself on Esc too
  });
  return {
    show: () => { on = true; root.style.display = 'flex'; document.body.classList.add('rb-roaming'); },
    hide: () => { on = false; root.style.display = 'none'; document.body.classList.remove('rb-roaming'); },
    update: (live, pending) => { const s = pending > 0 ? t('roam.loading', { n: live, of: live + pending }) : ''; if (status.textContent !== s) status.textContent = s; },
  };
}
