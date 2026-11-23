import { t } from '../i18n';
import { h } from './uiKit';
import { injectRoamCss, ICON_PAUSE, ICON_RESPAWN } from './roamCss';

export interface RoamHud { show(): void; hide(): void; update(live: number, pending: number): void; tokens(n: number, all: number): void }

/**
 * Free Drive top bar (menu style): Respawn and Pause icon buttons (phones have no keyboard), the neon-token count, and
 * while the city streams in a "building the city" line. Keys while shown: R respawn, Esc pause / resume.
 */
export function roamHud(a: { respawn: () => void; pause: () => void }): RoamHud {
  injectRoamCss();
  const root = h('div', 'rb-roam');
  const icon = (svg: string, label: string, fn: () => void): HTMLButtonElement => {
    const b = h('button', 'rb-ib') as HTMLButtonElement;
    b.innerHTML = svg; b.title = label; b.setAttribute('aria-label', label);
    b.addEventListener('pointerup', (e) => { e.preventDefault(); fn(); });
    b.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); fn(); } });
    return b;
  };
  const tok = h('span', 'rb-tok');
  const dia = document.createElement('i');
  const num = document.createElement('span');
  tok.append(dia, num);
  const status = h('span', 'rb-st');
  root.append(icon(ICON_RESPAWN, t('roam.respawn'), a.respawn), icon(ICON_PAUSE, t('roam.pause'), a.pause), tok, status);
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
    tokens: (n, all) => { const s = `${n}/${all}`; if (num.textContent !== s) num.textContent = s; },
  };
}
