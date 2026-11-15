import type { UiSize } from '../core/save';

/** Scale for the S / M / L size settings (subtitle box, minimap). */
export const SIZE_SCALE: Record<UiSize, number> = { S: 1, M: 1.25, L: 1.5 };

/**
 * Publishes the size settings as CSS variables on <html>: `--rb-sub-scale` (DJ Switch subtitle box) and
 * `--rb-map-scale` (minimap). Any CSS can use `calc(<base size> * var(--rb-sub-scale, 1))`.
 */
export function applyUiSizes(s: { subtitleSize: UiSize; minimapSize: UiSize }): void {
  const root = document.documentElement.style;
  root.setProperty('--rb-sub-scale', String(SIZE_SCALE[s.subtitleSize]));
  root.setProperty('--rb-map-scale', String(SIZE_SCALE[s.minimapSize]));
}
