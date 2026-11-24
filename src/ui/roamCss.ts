import { MAP_CSS } from './roamMapCss';

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
.rb-where{position:fixed;left:50%;transform:translateX(-50%);top:calc(max(var(--sp-3),var(--safe-t)) + 56px);max-width:min(420px,70vw);z-index:11;padding:var(--sp-1) var(--sp-4);text-align:center;background:var(--panel);border-radius:999px;border:1px solid var(--line);font:700 clamp(12px,.3vw + 9px,15px) var(--font);color:var(--text);text-shadow:0 1px 3px #000;pointer-events:none}
.rb-where .rb-wl{font-weight:500;font-size:.9em;color:var(--text-dim);margin-top:3px;transition:opacity .6s}
.rb-city-offer{position:fixed;top:calc(max(var(--sp-3),var(--safe-t)) + 56px);left:50%;transform:translateX(-50%);z-index:12;display:none;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);max-width:calc(100vw - 32px);background:var(--panel);border:1px solid #ffb02099;border-radius:var(--radius);box-shadow:0 8px 24px #000a,0 0 18px #ffb02033;color:var(--amber);font:600 14px var(--font)}
.rb-city-offer .rb-btn{min-height:44px}
body.rb-offer .rb-where{display:none!important}
@media (pointer:coarse){.rb-city-offer>.rb-sub:last-child{display:none}}
@media (max-height:480px){.rb-where .rb-wl{display:none}.rb-city-offer{padding:var(--sp-2) var(--sp-3);max-width:min(430px,calc(100vw - 230px));top:calc(max(var(--sp-2),var(--safe-t)) + 52px)}.rb-city-offer .rb-sub{letter-spacing:1px;font-size:11px}.rb-city-offer .rb-ot{font-size:13px}}
.rb-city-offer .rb-ot{font-weight:900;font-size:1.05em;color:#ffd27d}
.rb-city-offer .rb-btn{min-width:0;padding:var(--sp-2) var(--sp-4)}
body.rb-roaming #hud .info,body.rb-roaming #hud .lights,body.rb-roaming #minimap,body.rb-roaming #hud .tl small{display:none!important}
body.rb-roaming .rb-where{display:block}.rb-where{display:none}
/* Free Drive pause: three columns on short screens (only while open: .on), scrolls if still too tall */
@media (max-height:480px){.rb-roampause.on{display:grid!important;grid-template-columns:repeat(3,1fr);align-content:start;gap:var(--sp-2) var(--sp-3);width:min(600px,96vw);margin:0 auto;padding:max(var(--sp-3),var(--safe-t)) 0 var(--sp-3);overflow:auto}.rb-roampause>h2,.rb-roampause>section{grid-column:1/4}.rb-roampause>h2{margin:0}.rb-roampause .rb-btn{min-width:0;width:100%;min-height:44px}.rb-roampause .rb-panel{padding:var(--sp-2);width:auto!important}.rb-roampause .rb-panel h3{display:none}.rb-roampause .rb-panel .rb-row{display:grid!important;grid-template-columns:repeat(3,1fr);gap:var(--sp-2)}.rb-roampause .rb-panel .rb-btn{padding:var(--sp-2) var(--sp-1)}}
body.rb-fdover .rb-where,body.rb-fdover .rb-roam-mini,body.rb-fdover .rb-mission,body.rb-fdover .rb-roam,body.rb-fdover .rb-city-offer,body.rb-fdover .rb-call,body.rb-fdover #hud,body.rb-fdover .rb-fullscreen{display:none!important}
body.rb-roaming .rb-tc .sm:not(.gm){display:none}
/* police heat: the wanted stars and the busted meter */
.rb-heat{position:fixed;left:max(12px,var(--safe-l));top:max(12px,var(--safe-t));z-index:12;display:none;padding:var(--sp-1) var(--sp-3);background:var(--panel);border:1px solid #ff4d6d99;border-radius:var(--radius);box-shadow:0 6px 18px #000a;animation:rb-siren 0.6s steps(2) infinite}
.rb-heat .rb-hl{font:900 11px var(--font);letter-spacing:3px;color:#ff8da1}.rb-stars{display:flex;gap:2px}.rb-stars svg{width:22px;height:22px;fill:#ffffff22;stroke:#ffffff44;stroke-width:1}.rb-stars svg.on{fill:#ffd24d;stroke:#fff2b0}
.rb-bust{height:5px;margin-top:4px;border-radius:3px;background:#ffffff1c;overflow:hidden}.rb-bust u{display:block;height:100%;background:linear-gradient(90deg,#2a6bff,#ff2030)}
@keyframes rb-siren{0%{box-shadow:0 6px 18px #000a,0 0 14px #ff203088}100%{box-shadow:0 6px 18px #000a,0 0 14px #2a6bff88}}
body.rb-fdover .rb-heat{display:none!important}
/* story place offer and phone call (docs/nfs-vision.md item 1) */
.rb-story-offer{border-color:#ff3aa699;box-shadow:0 8px 24px #000a,0 0 18px #ff3aa633;color:var(--text)}
.rb-story-offer .rb-pt{flex:none;line-height:0}.rb-story-offer .rb-pt canvas{width:56px;height:56px;border-radius:50%;border:2px solid #ff3aa6;background:#0b0f18}
.rb-story-offer .rb-st-k{color:#ff8ccc;letter-spacing:2px;font-size:11px}.rb-story-offer .rb-ot{color:#fff}
.rb-story-offer .rb-st-w{text-transform:none;letter-spacing:.5px;font-size:12.5px}
.rb-story-offer .rb-st-i{font-weight:500;font-size:12.5px;color:var(--text-dim);max-width:36ch;margin-top:2px}
.rb-call{position:fixed;top:calc(max(var(--sp-3),var(--safe-t)) + 56px);left:50%;transform:translateX(-50%);z-index:12;display:none;align-items:center;gap:var(--sp-3);padding:var(--sp-2) var(--sp-4) var(--sp-2) var(--sp-2);max-width:calc(100vw - 32px);background:var(--panel);border:1px solid #ff3aa688;border-radius:999px;box-shadow:0 8px 24px #000a;font:600 14px var(--font);animation:rb-callin var(--dur-slow) var(--ease) backwards}
@keyframes rb-callin{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%)}}
.rb-call canvas{width:44px;height:44px;border-radius:50%;border:2px solid #ff3aa6;background:#0b0f18}.rb-call .rb-ot{font-weight:900;color:#fff}.rb-call .rb-sub{text-transform:none;letter-spacing:.3px;font-size:13px}
body.rb-calling .rb-where,body.rb-offer .rb-call,body.rb-has-mission .rb-call{display:none!important}
@media (max-height:480px){.rb-story-offer .rb-pt canvas{width:44px;height:44px}.rb-story-offer .rb-st-i{display:none}.rb-story-offer{max-width:min(470px,calc(100vw - 150px))}.rb-call{top:calc(max(var(--sp-2),var(--safe-t)) + 64px);max-width:min(460px,calc(100vw - 150px))}}
body.rb-has-mission .rb-where{display:none!important}body.rb-has-mission .rb-city-offer{top:calc(max(var(--sp-3),var(--safe-t)) + 124px)}
.rb-mission{left:50%!important;transform:translateX(-50%);max-width:min(440px,calc(100vw - 260px))}

.rb-roam-mini{position:fixed;left:max(12px,var(--safe-l));bottom:max(12px,var(--safe-b));width:150px;height:150px;border-radius:50%;z-index:11;display:none;box-shadow:0 0 0 2px #18d8ff55,0 0 18px #0008}
@media (pointer:coarse){.rb-roam-mini{left:auto;bottom:auto;right:max(12px,var(--safe-r));top:max(12px,var(--safe-t));width:112px;height:112px}}
`+MAP_CSS;
export const ICON_RESPAWN = '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
export const ICON_MAP = '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/></svg>';
export const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>';

let injected = false;
/** Add ROAM_CSS to the page once (the offer card and the HUD both need it, whichever is built first). */
export function injectRoamCss(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = ROAM_CSS;
  document.head.appendChild(style);
}
