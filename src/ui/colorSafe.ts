/** Colour-blind safe HUD: the good/bad pair (green/red) becomes blue/orange through the theme tokens. No per-frame work. */
export const SAFE_GOOD = '#4db8ff';
export const SAFE_BAD = '#ffb000';
const CSS = `:root[data-cb]{--green:${SAFE_GOOD};--red:${SAFE_BAD}}`;

/** Turn the colour-safe palette on or off. Safe to call often; the style block is added once. */
export function applyColorSafe(on: boolean): void {
  const root = document.documentElement;
  if (!document.getElementById('rb-cb-css')) {
    const st = document.createElement('style');
    st.id = 'rb-cb-css';
    st.textContent = CSS;
    document.head.append(st);
  }
  if (on) root.setAttribute('data-cb', '');
  else root.removeAttribute('data-cb');
}
