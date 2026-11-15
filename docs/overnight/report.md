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

## 11 Every car gets its own engine sound
- New `src/data/engineVoices.ts`: one `EngineVoiceSpec` per car (firings per rev, harmonic roll-off at light/full load, even/odd mix, bark harmonic, cylinder lumpiness, idle roughness, three exhaust formants, intake roar, mechanical whine, VTEC/howl crossover, diesel clatter, limiter style, pop multiplier, grit). `audio/engineDsp` consumes the table (worklet gets it as JSON; oscillator fallback uses the same `per`). The old 4-layout switch is gone from `audioManager` and `rivalEngines`; rivals use their own car's voice (+ their real limiter cut). Voicing presets still scale the car voice. Turbo audio/model untouched; nitro backfire still goes through `turboSound.pop` (LOCKED).
- Verified: build, all tests, new `tests/engine-voices-check.mts` (`VERBOSE=1` prints the table). No clipping (peak 0.70), RMS 0.45-0.55, closest pair of centroids 7.1 % apart.
- Hear it: Garage > pick a car > "Sound test (hold)" (works for owned and unowned cars; release for lift-off pops and blow-off).
- Voices (centroid at 3000 rpm): Civic 1739 Hz, thin high-revving NA four with a VTEC-style edge above 5.6k. Golf 563 Hz, muted turbo-four drone. 350Z 1193 Hz, rough throaty V6 with more pops. RX-7 1280 Hz (87 % of energy above 2 kHz at 85 % redline), smooth rotary buzz with a high whine and almost no roughness. 535d 260 Hz, diesel clatter, low rumble, almost no top end, no pops. M3 2052 Hz, bright smooth NA six with an intake howl above 5k. Evo 1542 Hz, rough idle, edgy, most overrun crackle. Supra 701 Hz, deep smooth twin-turbo six.
- Not changed: `scripts/overnight-tab.sh` was modified by the runner setup, not by this task; left out of the commit.
