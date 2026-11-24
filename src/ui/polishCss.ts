/**
 * GUI polish round (owner 2026-11-23: "make the GUI better looking"): menu hierarchy, horizontal card carousels on phones,
 * bigger tap targets, sticky settings tabs, readable locked cards, desktop scaling so a big monitor is not a phone UI.
 */
export const POLISH_CSS = `
.rb-stack .rb-btn.feat{border-color:var(--cyan);background:linear-gradient(180deg,#14305a,#0a1a38);box-shadow:inset 0 1px 0 #ffffff22,var(--glow-cyan);font-weight:900;letter-spacing:2px}
.rb-stack .rb-btn:not(.hot):not(.feat){font-size:.92em;color:var(--text-dim);letter-spacing:1.5px}
.rb-stack .rb-btn:not(.hot):not(.feat):hover,.rb-stack .rb-btn:not(.hot):not(.feat):focus{color:var(--text)}
.rb-card:not(.rb-pick){color:var(--text-dim);border-color:#18d8ff22;background:linear-gradient(180deg,#121833,#090c1a)}
.rb-card:not(.rb-pick) b,.rb-card:not(.rb-pick) .rb-sub{color:var(--text)}
.rb-up .u-n,.rb-up .u-d,.rb-up .u-p{display:inline-block;min-height:24px;line-height:24px}
.rb-up .rb-btn,.rb-up button{min-height:44px}
.rb-tabbar{position:sticky;top:0;z-index:3;background:linear-gradient(180deg,var(--panel-solid) 75%,#0a0d1c00);padding-bottom:var(--sp-2)}
@media (pointer:coarse){.rb-btn,.rb-chip,.rb-tabbar button{min-height:44px}.rb-up .u-n{min-height:32px;line-height:32px}input[type=range]{min-height:44px}}
@media (max-height:480px) and (orientation:landscape){
  .rb-layer .rb-row:has(>.rb-card.rb-pick){flex-wrap:nowrap;align-items:stretch;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;flex:none;justify-content:flex-start;width:100%;max-width:100vw;padding:var(--sp-2) max(var(--sp-4),var(--safe-l));-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .rb-layer .rb-row:has(>.rb-card.rb-pick)::-webkit-scrollbar{display:none}
  .rb-layer .rb-row:has(>.rb-card.rb-pick)>.rb-card{flex:0 0 min(250px,64vw);scroll-snap-align:center;margin:0;padding:var(--sp-2) var(--sp-3);font-size:.92em}
  .rb-layer .rb-row:has(>.rb-card.rb-pick)>.rb-card img,.rb-layer .rb-row:has(>.rb-card.rb-pick)>.rb-card canvas{max-height:64px;width:auto;max-width:100%}
  .rb-layer .rb-row:has(>.rb-card:not(.rb-pick)){flex-wrap:nowrap;align-items:stretch;overflow-x:auto;scroll-snap-type:x mandatory;justify-content:flex-start;width:100%;padding:var(--sp-2) max(var(--sp-4),var(--safe-l))}
  .rb-layer .rb-row:has(>.rb-card:not(.rb-pick))>.rb-card{flex:0 0 min(250px,64vw);scroll-snap-align:center;margin:0}
}
@media (min-width:1500px) and (min-height:800px){.rb-layer{zoom:1.25}}
@media (min-width:1900px) and (min-height:1000px){.rb-layer{zoom:1.5}}
@media (min-height:640px){.rb-main .rb-logo{margin-top:clamp(40px,8vh,84px)}}
/* REP level and cash in one header (docs/nfs-vision.md section 3) */
.rb-hdr{position:fixed;right:max(18px,env(safe-area-inset-right),2.5vw);top:max(14px,env(safe-area-inset-top),2vh);z-index:31;display:flex;gap:8px;align-items:center;max-width:90vw}
.rb-hdr .rb-cash{position:static;right:auto;top:auto}
.rb-rep{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#05060dcc;border:1px solid #ff3aa655;box-shadow:0 0 16px #ff3aa622;font:800 clamp(13px,1.6vw,18px) var(--font);color:#ffd1ea;white-space:nowrap}
.rb-rep i{display:block;width:clamp(44px,6vw,76px);height:6px;border-radius:3px;background:#ffffff22;overflow:hidden}
.rb-rep u{display:block;height:100%;background:linear-gradient(90deg,#ff3aa6,#ffb347);border-radius:3px}
@media (max-height:480px){.rb-rep i{display:none}}
`;
