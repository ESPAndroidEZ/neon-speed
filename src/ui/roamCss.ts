/** Free Drive overlay styles in the menu style (docs/ui-style.md): glass pills, cyan hairlines, one amber offer card. Tokens from theme.ts. */
export const ROAM_CSS = `
.rb-roam{position:fixed;top:max(var(--sp-3),var(--safe-t));left:50%;transform:translateX(-50%);z-index:12;display:none;align-items:center;gap:var(--sp-2);padding:var(--sp-1) var(--sp-2);max-width:calc(100vw - 2*max(var(--sp-3),var(--safe-l)) - 200px);background:var(--panel);border:1px solid var(--line);border-radius:999px;box-shadow:0 6px 18px #0009;font:700 clamp(12px,.3vw + 9px,15px) var(--font);color:var(--text);user-select:none}
.rb-roam .rb-ib{position:relative;width:44px;height:44px;flex:none;display:grid;place-items:center;padding:0;color:var(--text);background:transparent;border:1px solid transparent;border-radius:50%;cursor:pointer;touch-action:manipulation;transition:background var(--dur-fast),border-color var(--dur-fast),transform var(--dur-fast)}
.rb-roam .rb-ib:hover,.rb-roam .rb-ib:focus-visible{background:#18d8ff22;border-color:var(--cyan);outline:none}
.rb-roam .rb-ib:active{transform:scale(.92)}
.rb-roam svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.rb-roam .rb-tok{display:inline-flex;align-items:center;gap:6px;padding:0 var(--sp-3);color:var(--cyan);font-variant-numeric:tabular-nums;white-space:nowrap}
.rb-roam .rb-tok i{width:10px;height:14px;background:var(--cyan);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:var(--glow-cyan)}
.rb-roam .rb-st{color:var(--text-dim);font-weight:600;padding-right:var(--sp-2);white-space:nowrap}
.rb-roam .rb-st:empty{display:none}
.rb-where{position:fixed;left:max(var(--sp-3),var(--safe-l));bottom:calc(max(var(--sp-3),var(--safe-b)) + 175px);max-width:min(340px,60vw);z-index:11;padding:var(--sp-2) var(--sp-3);background:var(--panel);border-left:3px solid var(--magenta);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font:700 clamp(12px,.3vw + 9px,15px) var(--font);color:var(--text);text-shadow:0 1px 3px #000;pointer-events:none}
.rb-where .rb-wl{font-weight:500;font-size:.9em;color:var(--text-dim);margin-top:3px;transition:opacity .6s}
.rb-city-offer{position:fixed;top:calc(max(var(--sp-3),var(--safe-t)) + 56px);left:50%;transform:translateX(-50%);z-index:12;display:none;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);max-width:calc(100vw - 32px);background:var(--panel);border:1px solid #ffb02099;border-radius:var(--radius);box-shadow:0 8px 24px #000a,0 0 18px #ffb02033;color:var(--amber);font:600 14px var(--font)}
.rb-city-offer .rb-ot{font-weight:900;font-size:1.05em;color:#ffd27d}
.rb-city-offer .rb-btn{min-width:0;padding:var(--sp-2) var(--sp-4)}
body.rb-roaming #hud .info,body.rb-roaming #hud .lights,body.rb-roaming #minimap,body.rb-roaming #hud .tl small{display:none!important}
body.rb-roaming .rb-where{display:block}.rb-where{display:none}
`;
export const ICON_RESPAWN = '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
export const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>';
