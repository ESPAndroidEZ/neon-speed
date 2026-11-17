/** Design tokens of docs/ui-style.md as CSS custom properties. Injected once by `injectCss` (uiKit); every screen may use `var(--...)`. */
export const THEME_CSS = `
:root{
  --bg:#05060d; --panel:#0a0d1ccc; --panel-solid:#0a0d1c; --line:#18d8ff55;
  --cyan:#18d8ff; --magenta:#ff2a9d; --violet:#7a2fd6; --amber:#ffb347; --green:#7dff9a; --red:#ff5470;
  --text:#e8f6ff; --text-dim:#e8f6ffb3; --text-faint:#e8f6ff66;
  --font:system-ui,'Segoe UI',Roboto,sans-serif;
  --fs-xs:11px; --fs-sm:13px; --fs-md:16px; --fs-lg:22px; --fs-xl:clamp(28px,5vw,44px); --fs-hero:clamp(44px,9vw,96px);
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px; --sp-6:40px;
  --radius:10px; --radius-sm:6px;
  --glow-cyan:0 0 22px #18d8ff66; --glow-magenta:0 0 22px #ff2a9d66;
  --ease:cubic-bezier(.2,.8,.2,1); --dur-fast:120ms; --dur:220ms; --dur-slow:420ms;
  --safe-t:env(safe-area-inset-top); --safe-r:env(safe-area-inset-right); --safe-b:env(safe-area-inset-bottom); --safe-l:env(safe-area-inset-left);
}
.rb-chip{display:inline-flex;gap:var(--sp-2);align-items:center;padding:var(--sp-1) var(--sp-3);border:1px solid var(--line);border-radius:999px;background:var(--panel);font-size:var(--fs-sm)}
.rb-label{font-size:var(--fs-xs);letter-spacing:3px;text-transform:uppercase;color:var(--text-dim)}
.rb-appear{animation:rb-in var(--dur) var(--ease) backwards}
/* animated neon menu: titles flicker like a tube, buttons rise in one after another */
.rb-title{animation:rb-flicker 7s infinite}
@keyframes rb-flicker{0%,18%,22%,62%,64%,100%{opacity:1}20%{opacity:.82}63%{opacity:.7}}
.rb-layer .rb-btn{animation:rb-in var(--dur-slow) var(--ease) backwards}
.rb-layer>.rb-card,.rb-layer>.rb-row,.rb-layer>.rb-panel,.rb-layer>.rb-grid{animation:rb-in var(--dur-slow) var(--ease) backwards}
.rb-layer .rb-btn:nth-of-type(2){animation-delay:.06s}.rb-layer .rb-btn:nth-of-type(3){animation-delay:.12s}.rb-layer .rb-btn:nth-of-type(4){animation-delay:.18s}
.rb-layer .rb-btn:nth-of-type(5){animation-delay:.24s}.rb-layer .rb-btn:nth-of-type(6){animation-delay:.3s}.rb-layer .rb-btn:nth-of-type(7){animation-delay:.36s}
/* NEON SPEED wordmark: NEON cyan, SPEED magenta, each tube flickers on its own beat */
.rb-wm{font:900 italic var(--fs-hero) var(--font);letter-spacing:.06em;margin:0;text-align:center;line-height:1}
.rb-wm em{color:#d8f8ff;text-shadow:0 0 10px var(--cyan),0 0 32px var(--cyan),0 0 64px #18d8ff88;animation:rb-flicker 7s infinite}
.rb-wm strong{color:#ffe0f0;text-shadow:0 0 10px var(--magenta),0 0 32px var(--magenta),0 0 64px #ff2a9d88;animation:rb-flicker 9s 2s infinite}
@media (prefers-reduced-motion:reduce){.rb-title,.rb-wm em,.rb-wm strong,.rb-layer .rb-btn{animation:none}}
@keyframes rb-fade{from{opacity:0}to{opacity:1}}
@keyframes rb-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
`;
