import { t } from '../i18n';

/**
 * Car-picker navigation: Left/Right (and A/D) keys and a horizontal swipe on `root` call
 * prev/next. The key listener removes itself once `root` leaves the page, so screens never leak listeners.
 * Keys typed into inputs (the plate field) are ignored.
 */
export function carNav(root: HTMLElement, prev: () => void, next: () => void): void {
  const onKey = (e: KeyboardEvent): void => {
    if (!root.isConnected) { window.removeEventListener('keydown', onKey); return; }
    if ((e.target as HTMLElement | null)?.closest?.('input,textarea,select')) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') prev();
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') next();
  };
  window.addEventListener('keydown', onKey);
  let x0 = 0, y0 = 0, id = -1;
  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY;
  });
  root.addEventListener('pointerup', (e) => {
    if (e.pointerId !== id) return;
    id = -1;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? prev : next)();
  });
}

const CHEVRON = {
  prev: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 4.5 7.5 12 15 19.5"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4.5 16.5 12 9 19.5"/></svg>',
} as const;

/**
 * Previous / next car button: an inline-SVG chevron (no font glyph), 52 px square touch target, translated
 * aria-label. The list wraps around, so neither end is ever disabled.
 */
export function navButton(dir: 'prev' | 'next', onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rb-btn rb-nav';
  b.innerHTML = CHEVRON[dir];
  const label = t(dir === 'prev' ? 'nav.prev' : 'nav.next');
  b.setAttribute('aria-label', label);
  b.title = label;
  b.style.cssText = 'min-width:52px;width:52px;height:52px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:28px;flex:none';
  b.addEventListener('click', onClick);
  return b;
}
