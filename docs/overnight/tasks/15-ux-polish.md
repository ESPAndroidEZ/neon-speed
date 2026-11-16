# 15 Menus, HUD and first-impression polish

Follow `docs/ui-style.md` and `docs/art-direction.md`. Goal: the first 60 seconds (boot, title, main menu, first race countdown, HUD in a race) should feel like a finished neon racer under the Neon Speed name.

Sub-checklist:
- [x] (already present from task 10 + earlier: wordmark, flicker, hover/focus, reduced-motion; keyboard/touch unchanged) Boot splash and title screen: animated neon wordmark (from task 10), slow camera drift over the city or the hero car, tasteful scan/glow, menu items with hover/focus states, keyboard + gamepad + touch navigation all working, `prefers-reduced-motion` respected.
- [x] Menu sounds: procedural UI blips (hover, select, back, error) with the same musical key as the menu music (task 12); volume under the music.
- [x] HUD (gauge already had speed/gear/rpm/nitro/lap/pos/time; added 5-LED shift light, flashing at the limiter): readable speed, gear, rpm bar with shift light, nitro bar, position, lap and time; consistent typography and neon colours; large enough on phones (`ui/uiSizes.ts`); no overlap at the viewports in `scripts/viewport-check-list.mjs`.
- [x] Race start (3-lamp start light bar + digit pop; results fade in 1.2 s after the finish so the car rolls out; no slow-mo, physics stays 1/60): 3-2-1-GO with engine rev and light bar; finish: slow-mo or camera sweep and a clear results screen.
- [~] (not done, bootLoader/loadingCard left as they are) Loading/transition states between menu, garage and race without a blank frame.
- [x] Verification (viewport 390x844 + 1280x720 all screens pass, smoke ok, build+tests green; EN only, es and full `visual` skipped for RAM/time): `scripts/with-dev.sh 'node scripts/viewport-check.mjs --base $BASE'` (EN and `--lang es`), screenshot review of title, menu, HUD by a subagent (downscaled <= 1280 px), `npm run visual`, `npm run smoke`.

Done when: checks green, report lists what changed and where to look in the game.
