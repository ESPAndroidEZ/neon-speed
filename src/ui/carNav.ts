/**
 * Car-picker navigation without arrow glyphs: Left/Right (and A/D) keys and a horizontal swipe on `root` call
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

/** Text label for a prev/next tap target (no glyphs). */
export const NAV_LABEL = { prev: 'Prev', next: 'Next' } as const;
