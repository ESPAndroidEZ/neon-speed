/**
 * Phone fixes from the UI audit (docs/ui-story.md): short landscape screens get a narrow garage panel with the car free
 * on the right and a pinned action row; the pause list becomes two columns; tap areas reach 44 px; help text >= 12 px.
 */
export const PHONE_CSS = `
.rb-gact{position:sticky;bottom:0;z-index:2;background:linear-gradient(180deg,#0a0d1c00,var(--panel-solid) 30%);padding:var(--sp-2) 0 var(--sp-1)}
.rb-note,.rb-blurb,.rb-hint{font-size:max(12px,.8em)}
.rb-sw{position:relative}.rb-sw::after{content:'';position:absolute;inset:-8px}
.rb-lang .rb-btn,.rb-langrow .rb-btn{min-height:44px}
@media (max-height:480px) and (orientation:landscape){
  .rb-garage-layer{align-items:flex-start;justify-content:flex-start;padding-top:max(var(--sp-2),var(--safe-t));padding-bottom:max(var(--sp-2),var(--safe-b))}
  .rb-garage-layer>.rb-garage{width:min(330px,42vw)!important;max-height:calc(100dvh - 16px)!important;margin:0;padding:var(--sp-2) var(--sp-3);text-align:left!important}
  .rb-pause{display:grid!important;grid-template-columns:1fr 1fr;align-content:center;gap:var(--sp-2) var(--sp-3);padding-left:max(24px,18vw);padding-right:max(24px,18vw)}
  .rb-pause>h2,.rb-pause>.rb-sub,.rb-pause>.rb-row,.rb-pause>section{grid-column:1/3;margin:0}
  .rb-pause .rb-btn{min-width:0;width:100%}
}
`;
