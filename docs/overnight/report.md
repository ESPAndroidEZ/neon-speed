# Overnight report

Newest entries at the bottom. One entry per finished or blocked task: what changed, what was verified, what Carlos should look at.

## 01 Baseline (branch overnight/2026-11-16 at 87cb1df)
- `build:q` OK (tsc, 220-line check, vite build; three chunk 657 kB / 164 kB gzip). `test:q` ALL PASS (782 PASS lines, 0 FAIL, ~29 s). `smoke:q` OK (3 scenarios, ~4 s).
- Nothing failing before any change.

## 10 Rename to Neon Speed
- Player-visible name changed in index.html (title, apple title, boot splash), manifest, capacitor appName, Android app_name/title_activity_main, iOS display name, title screen, opening caption (+ ES caption key), README, AGENTS, docs (art-direction, plan, project-summary, story title, handoff note). Internal ids, `com.racersblood.game`, save/localStorage keys, repo and package name untouched.
- New wordmark: NEON (cyan) + SPEED (magenta) neon tubes, independent flicker, off under reduced-motion (`wordmark()` in ui/uiKit, `.rb-wm` in ui/theme, same look in the boot splash). `lang-check` and `e2e-check` now look for `.rb-wm`.
- Verified: build, all tests, `npm run lang`, smoke, screenshot of the title screen looked at (good).
- Found: `npm run smoke` passes vacuously when the dev server is not running (connection refused is not a console error); the baseline smoke above therefore proved nothing, but it is OK now with the dev server up. `lang`, `visual`, `viewport`, `e2e` need `npm run dev` running.
- Found: `npm run visual` has `neon-clear` FAILING on the untouched branch too (clipped 0.73%). Not caused by tonight's work; compare later changes against it. Touches lights/bloom (LOCKED-adjacent look), left for Carlos.
- docs/story.md lore line 8 still says "Racer's Blood is the Red Hand Wall"; task 14 (story rewrite) replaces it.
