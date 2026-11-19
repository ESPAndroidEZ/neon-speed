import { isNative, lockLandscape } from '../core/fullscreen';
import { ICONS } from './icons';
import { t } from '../i18n';

/**
 * Landscape only on phones. Where the browser allows it the orientation is locked (installed app / full screen on Android,
 * see manifest "orientation"); where it cannot (iPhone Safari) a full-screen "turn your phone" card covers the game in
 * portrait and `onPortrait` pauses a running race, so the game never plays sideways-up.
 */
export function installRotateHint(onPortrait?: () => void): void {
  if (typeof matchMedia !== 'function' || !matchMedia('(pointer: coarse)').matches || isNative() || navigator.webdriver) return; // never over automated browser tests
  const el = document.createElement('div');
  el.className = 'rb-rot';
  el.setAttribute('role', 'alert');
  el.innerHTML = `<div style="font-size:72px;line-height:1">${ICONS.rotate}</div><div style="font:900 clamp(20px,6vw,30px) system-ui,sans-serif;font-style:italic">${t('rotate.title')}</div><div style="font:600 14px system-ui,sans-serif;opacity:.75;max-width:80vw">${t('rotate.hint')}</div>`;
  el.style.cssText =
    'position:fixed;inset:0;z-index:9000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;' +
    'background:#05060d;color:#e8f6ff;touch-action:none;pointer-events:auto';
  document.body.append(el);
  let was = false;
  const update = (): void => {
    const portrait = window.innerHeight > window.innerWidth * 1.05;
    el.style.display = portrait ? 'flex' : 'none';
    if (portrait && !was) onPortrait?.();
    was = portrait;
    if (!portrait) lockLandscape();
  };
  window.addEventListener('resize', update);
  window.addEventListener('pointerdown', lockLandscape, { once: true, capture: true }); // some browsers allow the lock after the first tap
  screen.orientation?.addEventListener?.('change', update);
  update();
}
