/** Menu text size (accessibility). Scales menu screens only, never the race HUD. Own localStorage key (`ns.textsize`), not the game save. */
export type TextSize = 'N' | 'L' | 'XL';

export const TEXT_SIZE_KEY = 'ns.textsize';
export const TEXT_SIZES: readonly TextSize[] = ['N', 'L', 'XL'];
export const TEXT_ZOOM: Readonly<Record<TextSize, number>> = { N: 1, L: 1.15, XL: 1.3 };

const CSS = `:root[data-ts="L"] .rb-layer{zoom:${TEXT_ZOOM.L}}:root[data-ts="XL"] .rb-layer{zoom:${TEXT_ZOOM.XL}}`;
let current: TextSize = 'N';
let loaded = false;

/** Anything that is not a known size (junk, null) is normal. */
export function parseTextSize(raw: string | null): TextSize {
  return raw === 'L' || raw === 'XL' ? raw : 'N';
}

function paint(): void {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('rb-ts-css')) {
    const st = document.createElement('style');
    st.id = 'rb-ts-css';
    st.textContent = CSS;
    document.head.append(st);
  }
  if (current === 'N') document.documentElement.removeAttribute('data-ts');
  else document.documentElement.setAttribute('data-ts', current);
}

export function getTextSize(): TextSize {
  if (!loaded) loadTextSize();
  return current;
}

/** Set the size in memory, on the page and (never throwing) in localStorage. */
export function setTextSize(s: TextSize): void {
  current = s;
  loaded = true;
  paint();
  try {
    localStorage.setItem(TEXT_SIZE_KEY, s);
  } catch {
    /* private mode or full storage: the choice just lasts this session */
  }
}

/** Read the stored size and apply it. Call once at start-up. */
export function loadTextSize(): void {
  loaded = true;
  try {
    current = parseTextSize(localStorage.getItem(TEXT_SIZE_KEY));
  } catch {
    current = 'N';
  }
  paint();
}
