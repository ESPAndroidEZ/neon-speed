/**
 * Keeps the game sized to the REAL visible viewport: ResizeObserver on the container, visualViewport (mobile URL bars,
 * on-screen keyboards, pinch), orientation changes (some browsers report the new size a few frames late, so it re-checks).
 * Also publishes `--app-w` / `--app-h` on <html> for browsers without dvh units. Returns an unsubscribe.
 */
export function watchViewport(container: HTMLElement, onResize: () => void): () => void {
  let raf = 0;
  let lastW = -1, lastH = -1;
  const run = (): void => {
    raf = 0;
    const vv = window.visualViewport;
    const root = document.documentElement.style;
    root.setProperty('--app-w', `${Math.round(vv?.width ?? window.innerWidth)}px`);
    root.setProperty('--app-h', `${Math.round(vv?.height ?? window.innerHeight)}px`);
    const w = container.clientWidth, h = container.clientHeight;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    onResize();
  };
  const schedule = (): void => {
    if (!raf) raf = requestAnimationFrame(run);
  };
  const late = (): void => {
    schedule();
    window.setTimeout(schedule, 250); // iOS Safari reports the rotated size late
  };
  const obs = new ResizeObserver(schedule);
  obs.observe(container);
  window.visualViewport?.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', late);
  screen.orientation?.addEventListener?.('change', late);
  run();
  return () => {
    obs.disconnect();
    window.visualViewport?.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', late);
    screen.orientation?.removeEventListener?.('change', late);
    if (raf) cancelAnimationFrame(raf);
  };
}

/** Screen shape for layout decisions. */
export const isPortrait = (): boolean => window.innerHeight > window.innerWidth;
