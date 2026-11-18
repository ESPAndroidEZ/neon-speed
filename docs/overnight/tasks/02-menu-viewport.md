# 02 Main menu layout + viewport check

Source: `docs/fable-notes.md` items 1-3 ("Unfinished / not verified").

Problem: `GARAGE_CONFIG.menu.x = 0.3` moves the car right, but the main-menu button stack may still be centred, so they overlap. The full viewport check was never run after the change.

1. Check whether Qwen task 062 (`docs/tasks/062-hud-menu-layout.md`) already landed: `git branch --list 'qwen/062*'`, `git log --oneline -3 qwen/062*` if it exists, and `grep " 062 " logs/qwen/summary.txt`. Do not duplicate finished work; if 062 only exists on a branch, task 08 handles it later, so here pick the smaller fix below.
2. Run `scripts/with-dev.sh 'node scripts/viewport-check.mjs --base $BASE'` and again with `--lang es`. Read the output with grep/tail only.
3. Look at the MAIN MENU screenshots (portrait phone, landscape phone, desktop 16:9). Delegate the screenshot review to an Explore/general-purpose subagent and downscale to <= 1280 px wide; only its conclusion comes back.
4. If buttons and car overlap: simplest fix first, set `menu.x` back to 0 in `src/ui/garageConfig.ts`; only move the button stack if it is a few lines in `ui/menu.ts`. Keep it data-driven. Do not touch car models or the camera shake rules.
5. Re-run the viewport check in EN and ES; there must be no overflow or overlap findings that were not there before.

Done when: viewport-check is clean (or remaining findings are listed in the report with the viewport and element), `npm run build:q` and `npm run test:q` green.
