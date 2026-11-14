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
.rb-appear{animation:rb-in var(--dur) var(--ease) both}
@keyframes rb-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
`;
