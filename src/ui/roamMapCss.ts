/** Free Drive full map styles (menu look): canvas on the left, legend and buttons in a side panel; stacked on tall screens. */
export const MAP_CSS = `
.rb-fmap{z-index:31;display:none;flex-direction:row!important;align-items:center;justify-content:center;gap:var(--sp-4);padding:max(var(--sp-3),var(--safe-t)) max(var(--sp-3),var(--safe-r)) max(var(--sp-3),var(--safe-b)) max(var(--sp-3),var(--safe-l))}
.rb-fmap canvas{width:min(100vw - 300px,92vh);height:min(100vw - 300px,92vh);max-width:92vh;border-radius:var(--radius);border:1px solid var(--line);box-shadow:var(--glow-cyan);touch-action:none;cursor:crosshair;background:#0b0f18}
.rb-fmap .rb-side{display:flex;flex-direction:column;gap:var(--sp-2);width:230px;max-height:100%;overflow:auto}
.rb-fmap .rb-side h2{margin:0;font-size:var(--fs-lg)}
.rb-fmap .rb-side .rb-btn{min-height:44px;margin:0;min-width:0;width:100%}
.rb-fmap .rb-key{display:grid;grid-template-columns:auto 1fr;gap:var(--sp-1) var(--sp-2);align-items:center;font-size:var(--fs-sm);color:var(--text-dim)}
.rb-fmap .rb-key i{width:14px;height:14px;border-radius:50%;display:block;flex:none}
@media (max-aspect-ratio:1/1){.rb-fmap{flex-direction:column!important}.rb-fmap canvas{width:min(94vw,56vh);height:min(94vw,56vh)}.rb-fmap .rb-side{width:min(94vw,420px)}}
@media (max-height:480px){.rb-fmap{gap:var(--sp-3)}.rb-fmap canvas{width:min(100vw - 230px,88vh);height:min(100vw - 230px,88vh)}.rb-fmap .rb-side{width:200px}.rb-fmap .rb-key{grid-template-columns:auto 1fr auto 1fr;gap:3px 5px;font-size:10px;line-height:1.1}.rb-fmap .rb-key i{width:13px;height:13px}.rb-fmap .rb-side .rb-sub{display:none}}
`;
