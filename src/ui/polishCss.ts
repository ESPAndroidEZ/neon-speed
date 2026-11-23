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
  .rb-layer .rb-row:has(>.rb-card.rb-pick){flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;flex:none;justify-content:flex-start;width:100%;max-width:100vw;padding:var(--sp-2) max(var(--sp-4),var(--safe-l));-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .rb-layer .rb-row:has(>.rb-card.rb-pick)::-webkit-scrollbar{display:none}
  .rb-layer .rb-row:has(>.rb-card.rb-pick)>.rb-card{flex:0 0 min(250px,64vw);scroll-snap-align:center;margin:0;padding:var(--sp-2) var(--sp-3);font-size:.92em}
  .rb-layer .rb-row:has(>.rb-card.rb-pick)>.rb-card img,.rb-layer .rb-row:has(>.rb-card.rb-pick)>.rb-card canvas{max-height:64px;width:auto;max-width:100%}
  .rb-layer .rb-row:has(>.rb-card:not(.rb-pick)){flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x mandatory;justify-content:flex-start;width:100%;padding:var(--sp-2) max(var(--sp-4),var(--safe-l))}
  .rb-layer .rb-row:has(>.rb-card:not(.rb-pick))>.rb-card{flex:0 0 min(250px,64vw);scroll-snap-align:center;margin:0}
}
@media (min-width:1500px) and (min-height:800px){.rb-layer{zoom:1.25}}
@media (min-width:1900px) and (min-height:1000px){.rb-layer{zoom:1.5}}
`;
