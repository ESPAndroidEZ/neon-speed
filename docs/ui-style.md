# UI style: menus and HUD

Plain DOM + CSS variables (`src/ui/theme.ts` tokens + `src/ui/menuCss.ts` components, injected by `uiKit.injectCss`). Review every menu with `node scripts/ui-shots.mjs --tag <name>` (logs/ui/<name>/, contact sheet per size). Same neon language as the game: dark glass panels,
cyan edges, magenta for the primary action, italic heavy type for titles.

## Tokens (CSS custom properties on `:root`)
```
--bg: #05060d;  --panel: #0a0d1ccc;  --panel-solid: #0a0d1c;  --line: #18d8ff55;
--cyan: #18d8ff;  --magenta: #ff2a9d;  --violet: #7a2fd6;  --amber: #ffb347;  --green: #7dff9a;  --red: #ff5470;
--text: #e8f6ff;  --text-dim: #e8f6ffb3;  --text-faint: #e8f6ff66;
--font: system-ui, 'Segoe UI', Roboto, sans-serif;
--fs-xs: 11px; --fs-sm: 13px; --fs-md: 16px; --fs-lg: 22px; --fs-xl: clamp(28px,5vw,44px); --fs-hero: clamp(44px,9vw,96px);
--sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 40px;
--radius: 10px; --radius-sm: 6px;
--glow-cyan: 0 0 22px #18d8ff66; --glow-magenta: 0 0 22px #ff2a9d66;
--ease: cubic-bezier(.2,.8,.2,1); --dur-fast: 120ms; --dur: 220ms; --dur-slow: 420ms;
--safe-t: env(safe-area-inset-top); --safe-r: env(safe-area-inset-right); --safe-b: env(safe-area-inset-bottom); --safe-l: env(safe-area-inset-left);
```
## Type scale
Title (`--fs-hero`, 900 italic, tight tracking, text-shadow magenta + cyan); H2 `--fs-xl`; labels `--fs-xs` uppercase, letter-spacing 3-4px, `--text-dim`;
body `--fs-md`/`--fs-sm`; numbers (speed, times) tabular, italic 900.

## Components
- **Button** `.rb-btn`: min 240x48 (touch 44px min), uppercase, 2px tracking, `--panel` fill, `--line` border, hover/focus cyan glow; `.hot` = magenta border + glow (the primary action, one per screen); disabled 40% opacity.
- **Card** `.rb-card`: `--panel` fill, 1px `--line`, radius `--radius`, hover magenta border; selected = magenta glow.
- **Row** `.rb-row`: flex, wrap, gap `--sp-3`, centred. **Bar** `.rb-bar`: 7px, cyan to magenta fill. **Chip**: pill, label + value.
- **Toast**: bottom centre, `--panel-solid`, cyan border, 2.4 s. **Dialogue**: portrait + name (speaker colour) + typewriter text.
- Screens fade/slide in with `--dur` and `--ease`; focus order top to bottom; every action reachable with keyboard, gamepad (A/B) and touch.

## Menu pass 2026-11-16 (implemented)
- `.rb-panel` glass section (h3 = cyan section label with a fading rule); `.rb-card` is a static panel, `.rb-card.rb-pick` a clickable tile (tabIndex + Enter/Space).
- Hover/focus never moves an element (no translate/scale): moving targets flicker under the pointer and fail Playwright's stability wait. Glow and border only.
- Main menu `.rb-main`: logo + chapter top-left, `.rb-stack` of buttons on the left third (car stays right); under 520 px height the stack becomes a 2-column grid.
- Title `.rb-hero`: bottom gradient so the logo reads over the bright showroom.
- Settings `.rb-settings`: four panels (Sound, Game, Controls & driving, Graphics) in an auto-fit grid; rows = label left, control right; segmented buttons stay >= 44 px tall (viewport check).
- Tuning: `.rb-class` badge, `.rb-up` upgrade rows with level pips, `.rb-set` slider rows with `.rb-val`. Garage: `.rb-blurb`, `.rb-note`; asset/model badges only in dev builds.
- Sliders and checkboxes are custom-drawn (track gradient, toggle switch). No backdrop-filter on full-screen layers (phone cost).

## HUD layout (landscape, safe areas respected)
- Bottom right: speedo arc (large number, gear, tacho arc with redline in red), nitro bar under it (cyan; pulses on use), drift combo pop-ups above it (magenta, scale-in).
- Top right: lap, position, time. Top left: weather chip, tips fade out after 8 s. Bottom left: minimap. Centre: countdown, banners, "NITRO" burst, wrong-way warning.
- Edge speed lines above 120 km/h; HUD scale setting 80-130%.

## Rules
Max two accent colours per screen; text never below `--text-dim` on `--panel`; no pure white fills; hit targets >= 44px on touch; titles never wrap below 2 lines.
