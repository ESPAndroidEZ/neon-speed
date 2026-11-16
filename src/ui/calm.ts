/** Calm HUD (accessibility): stops flashing, pulsing and flickering UI. A root attribute plus one style block; no per-frame work. */
const CSS = `
:root[data-calm] .rb-shift.fl i,:root[data-calm] .rb-title,:root[data-calm] .rb-wm em,:root[data-calm] .rb-wm strong,
:root[data-calm] .rb-layer .rb-btn,:root[data-calm] #hud .ban.go,:root[data-calm] .rb-cg.brake{animation:none!important}
:root[data-calm] .rb-nitro-burst,:root[data-calm] .rb-pop,:root[data-calm] .rb-lines{display:none!important}
`;

/** Turn the calm HUD on or off. Safe to call often; the style block is added once. */
export function applyCalm(on: boolean): void {
  const root = document.documentElement;
  if (!document.getElementById('rb-calm-css')) {
    const st = document.createElement('style');
    st.id = 'rb-calm-css';
    st.textContent = CSS;
    document.head.append(st);
  }
  if (on) root.setAttribute('data-calm', '');
  else root.removeAttribute('data-calm');
}
