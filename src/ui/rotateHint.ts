import { isNative } from '../core/fullscreen';
import { ICONS } from './icons';
import { t } from '../i18n';

/**
 * Small "rotate your phone" pill in portrait on touch screens. Landscape is the recommended way to play, but portrait
 * stays playable, so this never blocks anything: it sits at the top centre, ignores taps, hides in landscape and after
 * the player has seen it for 6 s in this session.
 */
export function installRotateHint(): void {
  if (typeof matchMedia !== 'function' || !matchMedia('(pointer: coarse)').matches || isNative()) return;
  const el = document.createElement('div');
  el.className = 'rb-rot';
  el.setAttribute('role', 'status');
  el.innerHTML = `${ICONS.rotate}<span>${t('rotate.hint')}</span>`;
  el.style.cssText =
    'position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:95;display:none;align-items:center;gap:8px;' +
    'padding:8px 12px;border-radius:999px;background:#0a0d1ccc;border:1px solid #18d8ff66;color:#e8f6ff;font:700 12px system-ui,sans-serif;pointer-events:none;white-space:nowrap;max-width:calc(100vw - 24px)';
  (el.firstElementChild as HTMLElement | null)?.setAttribute('style', 'font-size:20px;flex:none');
  document.body.append(el);
  let shown = 0;
  let timer = 0;
  const update = (): void => {
    const portrait = window.innerHeight > window.innerWidth * 1.1;
    const on = portrait && shown < 6000;
    el.style.display = on ? 'flex' : 'none';
    if (on && !timer) {
      const t0 = performance.now();
      timer = window.setTimeout(() => {
        shown += performance.now() - t0;
        timer = 0;
        update();
      }, 6000 - shown);
    }
  };
  window.addEventListener('resize', update);
  screen.orientation?.addEventListener?.('change', update);
  update();
}
