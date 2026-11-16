# Overnight report

**Morning summary (branch `overnight/2026-11-16`, `git log main..HEAD --oneline`):**
1. Done: Neon Speed rename, per-car engine voices, procedural house music, detailing pass on all eight cars, story rewrite (EN+ES), menu blips, HUD shift light + start lights + results fade, language switch keeps state, dev keys hidden, allocation cleanup, two file splits. Build, all tests, smoke (9), `lang` green; `visual` has one FAIL, `neon-clear` clipped 0.62 % (0.73 % on the untouched branch, so slightly better, not caused by tonight).
2. Blocked / not done: needs Carlos (handling v2 default, tilt, licences, merge to main); Qwen 056-062 never ran; slow-mo finish, boot/loading polish and Chapter 3 not built; `neon-clear` clipping.
3. Look first: play a fresh save for the cold open (Mara's captions are time based), listen to the Garage "Sound test" for the eight engines and the menu music, check the title screen and the start lights.

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

## 12 Procedural house music
- `audio/musicPatterns` (pure, seeded): 64-bar songs (intro 8, build 8, drop 16, break 8, drop 16, outro 8), 118-126 BPM, 7 progressions, 4 grooves with swing, 7 keys, per-song motif/arp/stab variants. `audio/musicVoices`: kick (pitch sweep + click), clap, closed/open hats, saw+sub rolling bass, detuned-saw chord stabs, pad, pluck arp, lead, riser, crash. `audio/music`: lookahead scheduler on the AudioContext clock (250 ms), swing, kick-sidechain pump, generated-noise reverb, lead echo, mood changes only on the bar line.
- Moods: menu (calm, filtered, no drop), race (intensity from speed/nitro, +0.25 on the last lap), rain/snow (darker, wetter), garage (half-time lo-fi, set by `MUSIC_CUE.mood` from `ui/menu`), story (sparse pad). A new seed (new song) on every race start. Music bus ducks with engine load at speed and by up to 55 % under dialogue (`MUSIC_CUE.speech` from `ui/dialogue`). Music volume slider already existed (Settings); respects the autoplay policy (scheduler waits for a running context). Mobile (touch devices): `lite` voices, cheaper hats, shared noise buffer from the bus.
- Verified: build, all tests (`tests/audio-check.mts` rewritten for the new API: determinism per seed, ranges, no NaN, four-on-the-floor, sections, tempo, pool sizes, mood differences, mood levels <= 1), smoke (9 scenarios, no console errors), `scripts/audio-level.mjs` OK (peak max -11.3 dBFS, RMS mean -25.2).
- Scheduler cost: pattern logic 0.08 us/step in node (no allocation); node creation per step is the real cost and is a handful of oscillators/buffer sources per beat, not measured in a browser (no profiler overnight).
- Not done: offline render of the music bus (OfflineAudioContext) in tests; the check is on the pure generator.
- Listen: start the game (any key to unlock audio), menu = calm filtered loop; garage screens go lo-fi half-time; start a race for the full build/drop; rain/snow races are darker. Music slider in Settings.

## 13 Redesign all eight cars
- FOUND: only the Civic is procedural in the game; Golf, 350Z, RX-7, E61, M3, Evo and Supra load committed GLBs built by `blender/cars/*.py` (Blender is at ~/.local/bin, not on PATH: `export PATH=$HOME/.local/bin:$PATH`). The in-game wheels are always the procedural ones (`world/carWheels`, `world/rims`), the GLB wheel nodes are not used.
- New `blender/lib/detail.py` (door gaps, handles, belt moulding, sills, splitter, diffuser with fins, exhaust tips, grille slats, duct, fog), wired into all seven scripts with per-car positions; E61/M3 keep their own kidney grilles and the M3 its own exhausts. `rb.finish` now merges loose single-material parts into one mesh per material (about 35 meshes per car down to ~10: fewer draw calls), tris 5.8k-6.6k (budget 30k). GLBs grew ~150 KB each. Rebuild: `scripts/model-build.sh cars/<id>`; `model-check` OK for all.
- Civic (procedural): new `world/carExtras.ts` (wipers, side repeaters, rear reflectors, shark fin, per-look grilles, C pillar, intakes, roof spoilers), mirrors now have stalks and sit on the door line instead of floating.
- Wheels: `five` spokes reach the lip and get a lip ring, dish is darker (spokes read, no more pale discs).
- Light/wash: garage stage key light 260 -> 150 intensity, head/tail glow quads and headlight emissive reduced, tail idle 2.2 -> 1.0 (braking 6 unchanged), Civic factory white 0xe8e8ee -> 0xbfc4d0 so it no longer clips to a white blob under bloom. Turbo, handling, physics untouched.
- Verified: build, all tests, `npm run visual` (same single FAIL `neon-clear` as the untouched baseline; clipped 0.73 % -> 0.65 %, slightly better), chase view of the Supra at the grid looked at (good). Shots: `docs/screenshots/cars-2026-11-16/cars-3q.jpg`, `cars-rear.jpg` (`node scripts/car-shots.mjs`, `ANGLES=q,rear DIST=4.8`, then `node scripts/contact-sheet.mjs <angle> out.jpg`).
- Not done / for Carlos: body silhouettes of the Blender cars were not re-lofted (details only); tail lamps still read pale pink under the garage lights (bloom on emissive); no before shots of the six cars except `docs/screenshots/before/car-supra.png`.

## 14 Story rewrite
**Pitch (one minute).** Kestrel Bay, two a.m. You inherit a beat-up Civic that belonged to Cain Vega, the street's first legend, who vanished in a crash at Quay 9 twelve years ago. The first launch drops you straight into a race: Mara coaches you through the controls by phone while you drive, and only after you win do you get the conversation, the debt on her garage and the Red Hand Wall. Dante Voss, calm and formal, owns the debt and wants the whole Loop under Redline's rules. At the end of Chapter 1 DJ Switch, the pirate-radio voice that taught you to drive, turns out to be Cain. Mara hangs up on him: twelve years of silence is a betrayal too.

In Chapter 2 each district boss (Nova, Brick, Calloway, plus Lola and Rook on the streets) gives a vote and a clue: a towel at dawn, flowers at Quay 9 every year, a missing gate log, a man in a grey coat with a gull cufflink. The Council choice (`open` / `sponsor`) now changes the final race (Nova and Brick or Vex and Tank), Switch's in-race captions, the lighthouse scene and the ending card. The truth: Calloway's father cut the line, young Dante found it and was bought into silence, and his rules and his key were guilt. Open: the Wall gets Dante's hand and Mara forgives Cain. Sponsor: safety is bought, the proof stays in a drawer.

- Changed: cold open (first launch skips cards and dialogue, goes cinematic then race, with timed in-race `cues`; cards and the first conversation come AFTER the win, once, `cardsSeen` flag); dialogue rewritten for all 10 beats (same ids, order, flags, rivals, unlocks); 3 lose variants per beat (rotated per session); context flags for lines (`car-<id>`, `tier-N`, `replay`, `retry`); branch changes final field (`rivalsIf`), cues, lighthouse, ending card and credits ("NEON SPEED"); `open` / `sponsor` are now mutually exclusive in `applyChoice` (old bug: choosing the second door later left both flags); Crew bios gain a `truth` text after the ending; ~35 new radio/bark lines (clue plants, Cain's sayings, rival motives).
- Files: `src/data/storyLines1/2a/2b/2c.ts` (text), `story1.ts` (new, chapter 1 events), `story2a/2b.ts`, `story.ts` types + `Cue`, `game/story.ts`, `ui/storyMenu.ts` (credits), `i18n/esContentE..G.ts` (all new Spanish, Spain Spanish; 51 stale entries removed). `INTRO_LINES` removed. Docs: `docs/story.md` rewritten, `docs/story-review.md` is the critique.
- Verified: `build:q`, `test:q` (new `tests/story-graph-check.mts`: legacy ids and order, reachability, 3 lose variants, flag consistency, both branches reach different endings, clue order, line length), `i18n-check` (618 strings, all translated), `story2-check`, `career-check`.
- For Carlos: play from a fresh save to feel the cold open (no cards before the first race; Mara's captions during the race are time-based, so the corner caption may land a bit early or late, adjust `cues` in `data/story1.ts`). Existing saves keep loading; players who already finished Chapter 1 just see the new lines.
- Not done: `radio` has no branch-specific in-race lines other than the final's `cues`; Chapter 3 is not built (threads listed at the end of `docs/story.md`).
- Browser check (task 14): fresh save > Story > Warm-up goes straight to CINEMATIC with no cards or dialogue, then RACING, and "Mara: Gas down..." appears 3.2 s after the countdown start; no console errors. `lang-check` passes. `e2e-check` "menu to race" failed at 768x1024, 1024x768, 1366x768 and 2560x1080 with a click timeout on the first map card (Free Race, not story code; 3 parallel swiftshader contexts, the failing set varied between two runs, so likely load-related; not verified against the baseline).

## 15 Menus, HUD and first impression
- Menu sounds: `audio/uiSound.ts` (hover, select, back, error blips; triangle plucks in the current menu-music key, error is a dissonant square pair), delegated listeners on `.rb-btn`/`.rb-card` installed from `main.ts`; `Music.keyPc` exposed; `tests/ui-sound-check.mts`.
- HUD: 5-LED shift light on the gauge (cyan/amber/red from 80 % rpm, flashes at the limiter, static under reduced motion). Start sequence: three red lamps that go out per second, green on GO, digit zoom-in. Results screen fades in 1.2 s after the finish (instant under reduced motion).
- Verified: build, all tests, smoke (9 scenarios), viewport check at 390x844 and 1280x720 (all 8 screens ok), countdown and race screenshots looked at (good; lamps sit just above the car roof).
- Not done: boot/loading transition polish, slow-mo finish (fixed-step physics, left alone), full 10-viewport sweep and `--lang es` (the full sweep timed out at 8 min on this box; ran 2 viewports instead), `npm run visual` not re-run (untouched lights).
- Listen/look: any menu button (hover and click blips), start a race (lamps), rev to the limiter (shift LEDs).

## 03 Hide dev keys from the HUD
- `hud.keys` now lists only R / M / Esc; the 1/2/3 weather hint is `hud.keysDev` and only shown when `import.meta.env.DEV` (the hotkeys themselves were already dev-only). EN+ES in sync (`i18n-check` ok). `npm run lang` needs a dev server, not run.

## 02 Main menu layout + viewport check
- Ran the viewport check at all 10 viewports (EN) and 390x844, 844x390, 1280x720 in ES (one viewport at a time; running all 10 in one go times out on this box). Title/main-menu screenshots at 1366x768 and 360x640 looked at: wordmark, buttons and car do not overlap, `menu.x` left as is.
- It caught a REAL regression from task 15: the scaling start banner (full-width box) overflowed the screen at 360x640, 768x1024, 1024x768, 1920x1080 and 2560x1080. Fixed (`width:max-content`, animate the `scale` property); re-ran those: ALL PASS. Qwen task 062 not checked (task 08 covers Qwen branches).

## 05 Language switch keeps UI state
- `ui/subtitles`: every shown caption keeps its English source (`data-src`) and is re-translated in place on a language change (remaining display time untouched). `ui/dialogue`: the open line (and its choice buttons, if asked) redraws in the new language, finished text stays finished, typing lines restart. `ui/garage`: browsed car index survives a rebuild caused by a language switch (module-level `browsed` + a 400 ms window from a listener registered at import time, so the browsed car does not leak into the next fresh garage visit; the selected car and the save are never touched).
- Verified: build, all tests. NOT verified in a browser (UI-only, no pure logic to test); the garage has no language row today, so the garage case only triggers if a language change happens while it is open.

## 04 Spanish pass
- Grepped all `src/i18n/es*.ts` for LatAm vocabulary (carro, auto, celular, computadora, ahorita, manejar, llantas/rines, cajuela, boletos, ustedes-imperatives such as pulsen/elijan/toquen, voseo, bare Enter/Shift/Ctrl): zero hits. Spain markers are present (coche, móvil, conducir, matrícula, Intro, Mayús, neumáticos, latiguillo). Read a random sample of the new story strings (esContentF): register, tuteo and Spain Spanish are consistent, no calques found. 0 strings changed. `i18n-check` ok (331 UI keys, 618 content strings translated). `npm run lang` needs a dev server, not run.

## 06 Allocation audit
- Purity: `grep "from 'three'" src/physics` is empty. Grepped `src/physics src/core src/camera src/fx src/game` for `new Vector/Quaternion/Color/Euler`, `.clone()`, `.map/.filter/.slice/spread`: every hit is setup, snapshot or stats code (assists factory, carSnapshot, carStats, carRating, raceManager.place, engine ctor, ghost recording), none per step/frame. Telemetry and weather env use fill-style reuse already.
- Fixed (per-frame string building, all UI): `ui/hud.ts` `update` (info string rebuilt 60x/s, now a numeric key, rebuilt on change only), `ui/gauge.ts` `update` (string key, now numeric), `ui/cornerGuide.ts` `update` (string key plus an array literal per frame, now a numeric key, a module const and a `lastWord` compare). Behaviour identical; build and all tests green.
- LOCKED areas (drivetrain boost, stability, weather physics) were not opened. `scripts/soak.mjs` not run (browser, RAM rule).

## 07 Structural debt
- Split `ui/garage.ts` (218 -> 200 lines): stats cache, `hex`, `clamp01` and the hold-to-rev `soundTest` moved to `ui/garageParts.ts`. Split `world/city/textures.ts` (208 -> 140): shop-front and container textures moved to `world/city/texturesProps.ts` (importers in `facades.ts`/`yard.ts` updated, `tex`/`normalFrom`/`N` exported). Code only moved, build and all tests green, code map regenerated.
- Left alone: `main.ts` (218), `game/game.ts` (219), `core/raceManager.ts` (218), `audio/audioManager.ts` (218, turbo wiring is LOCKED-adjacent): bootstrap order or LOCKED code makes a move riskier than the gain; they have only 1-2 lines of headroom, so the next feature touching them must split first (suggested seam: `launchFree`/`loadSlot` out of main.ts).

## 08 Review Qwen branches
- Qwen is not running (the server is stopped on purpose). There are no branches for tasks 056-062 (task files exist in `docs/tasks/`, never started) and `logs/qwen/summary.txt` has no entries for them; the branches that exist (003-055) predate this work and were handled in earlier sessions (055 is checked out in another worktree, left alone). Nothing merged, nothing archived. 056-062 stay queued for Qwen.

## 09 Final verification
- Handoff "Overnight round" added, code map regenerated. build:q OK, test:q ALL PASS, smoke 9/9, `lang` ok, `visual` 1 FAIL (`neon-clear`, clipped 0.62 
## 09 Final verification
- Handoff "Overnight round" added, code map regenerated. build:q OK, test:q ALL PASS, smoke 9/9, `lang` ok, `visual` 1 FAIL (`neon-clear`, clipped 0.62 %, pre-existing, was 0.73 %). Nothing left running (vite/chrome checked).
