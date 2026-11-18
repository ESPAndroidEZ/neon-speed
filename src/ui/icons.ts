/** Inline SVG icons (stroke = currentColor), so no font glyphs ever show up as boxes. 24x24 viewBox. */
const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  /** Corners pointing out: enter full screen. */
  fullscreen: svg('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
  /** Corners pointing in: exit full screen. */
  fullscreenExit: svg('<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  /** Padlock: a locked story event (instead of the emoji, which has no glyph without an emoji font). */
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  reset: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/>'),
  /** Phone with a plus: add to home screen. */
  homescreen: svg('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 9v6M9 12h6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  rotate: svg('<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M8 3.5h6a4 4 0 0 1 4 4"/><path d="M16 5.5l2 2 2-2"/>'),
} as const;
