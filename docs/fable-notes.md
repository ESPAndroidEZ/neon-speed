# Notes for Fable (take-over list, 2026-11-15)

Written by Claude (Sonnet) at the end of the Spanish + pipeline + hooks round. These are the places I am NOT happy with or could not finish. Build is green, `npm test` all pass, `tests/i18n-check.mts` and `npm run lang` pass.

## Unfinished / not verified
1. **Last check was interrupted.** I did not run the full English `scripts/viewport-check.mjs` after the menu layout change (`GarageLayout` now has `'menu'`, `Menu.main()` passes it). Run: `scripts/with-dev.sh 'node scripts/viewport-check.mjs --base $BASE'` and also with `--lang es`. Only garage, settings, tune were looked at by eye.
2. **Main menu looks wrong until task 062 lands**: the car moves to the right (`GARAGE_CONFIG.menu.x = 0.3`) but the button stack is still centred. Either run 062 or set `menu.x` back to 0 in `src/ui/garageConfig.ts`. I never looked at a main-menu screenshot.
3. **ShowroomCam now moves the image with `setViewOffset`** (`src/game/showroomCam.ts`, `release()` called from `game.ts` outside MENU). Garage at 2560x1080 and 390x844 looked right; not checked on 32:9, in the story/cinematic hand-off, or on a real phone. Sign of the y offset (`sheet.y`) is unverified (positive should move the car up).
4. **Dead Aider/bootstrap files: DELETED** (Carlos confirmed). Was: Confirmed unreferenced: `.aider.conf.yml .aider.model.metadata.json .aider.model.settings.yml .aiderignore` (tracked), untracked `.aider.chat.history.md .aider.input.history .aider.tags.cache.v4`, root `start-qwen.sh` (identical copy of `scripts/start-qwen.sh`), `scripts/setup-wsl.sh` (one-time bootstrap that rewrites git history), the Aider block in `.gitignore`. `venv/` (numpy only, 94 MB, untracked) is also unreferenced. Carlos should confirm, then `git rm` them. `logs/` is ignored and nothing in it is tracked.
5. **Hermes launch line** (`scripts/qwen.sh`): `hermes chat --query-file "$prompt" -Q --in "$PWD" --max-turns 80 --run-budget 2700 --yolo`. All flags exist in the installed Hermes, `~/.hermes/config.yaml` points at `http://127.0.0.1:8080/v1` and the server answered /health. I could NOT confirm it is the exact command Carlos types by hand: ask him.
6. **Queue not started.** Tasks 058-062 exist, `scripts/qwen-queue.sh --dry-run 058 059 060 061 062` works, the baton in `docs/handoff.md` was left as it was. Run when ready: `setsid nohup scripts/qwen-queue.sh 058 059 060 061 062 > logs/qwen/queue.out 2>&1 &`, watch `tail -f logs/qwen/summary.txt`.

## Decisions I made that Carlos may not want
- **Task numbers are 058-062, not 020-024**: 020-024 already exist (archetypes, graffiti) and are merged work.
- **Spanish is Spain Spanish** (Carlos decided: coche, móvil, conducir, matrícula, Intro, Mayús, vosotros imperatives). Converted from an earlier Latin American draft by regex plus a hand pass; look for leftovers (LatAm words, `ustedes` forms).
- **Queue halts on a red build** (asked for), although every task restarts from `main`, so a red one does not really block the next. `CONTINUE_ON_RED=1` overrides.
- `AGENTS.md` now allows Qwen to import `../render/lookConfig`, `../ui/garageConfig`, `../i18n`.
- Qwen task 057 (i18n) is marked SUPERSEDED; its branch had no commits and is deleted.

## Weak spots in what I wrote
- **Spanish quality is machine-level, never read by a native speaker.** 480 content strings + ~330 UI keys. Tone of radio lines and Cain/Mara/Dante dialogue deserves a pass.
- Language switch re-renders menus/HUD/touch labels, but an open dialogue line, an already-shown subtitle and the garage's browsed car index (resets to the selected car) are not preserved.
- `hud.keys` shows the dev weather keys (1/2/3) to players; the voice test line `Kestrel Bay. Two a.m.` stays English; `ui/handlingOverlay.ts`, tuning part names (brands) and character names are intentionally untranslated.
- Unused keys from the earlier WIP (`tilt.enableTitle/Body`, `tilt.hudOn/Off`, `tilt.useWheel`, `tilt.debug`, `ctl.enableTilt`, `ob.lang`, `fs.homescreen` partly): the tilt Enable card, HUD icon and debug line still do not exist (handoff Next item 1).
- Settings label column: I replaced the fixed `width:90px` spans with `.rb-lbl` (`min-width 90px, flex 0 1 min(160px,40%)`). Checked at 360x640 and 844x390 in Spanish, not on every row at every viewport.
- Subtitle/minimap size rows in Settings and `--rb-sub-scale/--rb-map-scale` CSS variables are wired (`src/ui/uiSizes.ts`) but nothing reads the subtitle scale until task 062.
- `proceduralCar.ts` tail lights: replaced a per-frame `new Color` with `setHex` (small allocation fix), values unchanged.
- The five Qwen tasks were written WITHOUT seeing the screens. Task 059 guesses that the "blue box obstacles" are the parked cars in `world/props.ts` (CAR_COLORS has 0x1f3f7a); there may be other boxes (container yard props). Task 060 asks for a shader patch (`onBeforeCompile`) that Qwen has to get right blind: expect to review it by screenshot. Qwen cannot judge visuals; every acceptance check is numeric.

## Pre-existing problems I found
- `scripts/visual-check.mjs` is **flaky on main** (run 1: two failures incl. snow-speed mean 0.076 < 0.08; run 2: neon-clear failed). That is the known snow brightness problem (`docs/snow-findings.md`). That is why the queue tasks use `nitro-check` (clipped < 2 %, stable) instead.
- `src/game/game.ts` is at 219 lines, `ui/menu.ts` 193, `main.ts` ~218: no room left. Split before adding anything.
- Handoff "Next" item 1 (phone fix round: tilt https/secure-context, snow handling, pulse latch wiring) is still open.

## New tooling
`scripts/with-dev.sh '<cmd using $BASE>'` (vite on port 5199, runs the check, stops vite), `npm run lang`, `viewport-check.mjs --lang es`, `?lang=es` URL override, `tests/lab/i18n-harvest.mts` (lists every English content string; `tests/i18n-check.mts` fails on any missing Spanish).

---

# HARD PROBLEMS for Fable (new session starts here)

Read `docs/handoff.md`, `CLAUDE.md`, then this file. Sonnet/Qwen should not take these: they need deep reading, tuning by measurement or judgement about feel. Ordered by how much they matter to the player. Respect the LOCKED items in CLAUDE.md (turbo model, approved rain/snow physics, handbrake carry and drift hold, STANDARD assist) unless Carlos says otherwise in this session; where a fix needs a locked value changed, ASK first.

## 1. Snow handling is bad (top priority, blocks "feels good")
Root causes are already measured and written up in `docs/snow-findings.md` (repro scripts in `tests/lab/snow/`). Summary: snow grip table too low (`physics/weatherLevels.ts`, `physics/weather.ts`), traction capped at mu*load (`legacy/driveSplit.ts` TRACTION_SQUAT), all-or-nothing touch throttle collapsing rear lateral grip (`legacy/legacyStep.ts`), snow-bank drag ~15 m/s^2 on corner outsides (`surfaces.ts` bankDrag), v2 steering lock using dry grip (`v2/arcade.ts`), RWD power slide gated off below grip 0.6 (`legacy/stability.ts`). Civic 0-100 is 6.8 s dry vs 13.7 s in AGGRESSIVE snow, and the 350Z only reaches 155 km/h in 30 s. The numbers touch LOCKED snow physics: get Carlos's OK for the grip table, the rest can be fixed without changing the approved table. Update `tests/weather-check.mts` bands with the change; keep AI rules (same physics, no extra grip).
Related: **snow scenes are too dark** (visual-check `snow-speed` mean 0.076 vs min 0.08, flaky). Fix with grade/exposure, not by raising bloom.

## 2. Handling v2 is still behind a setting (legacy is default)
`src/physics/v2` (per-axle loads, load-sensitive tyres, combined slip, diffs/AYC, brakes, handbrake, weather mu) passes `tests/handling-v2-check.mts` only under a reinterpretation of two targets (0-200 order, rain/snow ratios; see "Results" in `docs/handling-plan.md`). Decide: tune until the strict targets pass and make v2 the default, or keep legacy and delete the cost. Needs a driving feel judgement per car (8 cars x 3 weathers) with `tests/lab/v2-*.mts` bots plus Carlos playing; STANDARD assist must equal the approved handling.

## 3. Phone: tilt steering never confirmed on a real device
Likely root cause: the LAN dev URL is plain http, not a secure context, so no `deviceorientation` events and no fallback card. To do: https dev server (vite basicSsl or a local cert), an event-arrival check with timeout -> falls back to touch wheel with a message, the "Enable tilt" card + HUD icon + Settings debug line (keys `tilt.*` already exist unused in `src/i18n/enControls.ts`), wire `input/pulseLatch` into `ui/touchControls`. Verify on an actual phone (`scripts/phone-access.ps1`), not just headless. Also performance on phones (draw calls ~40/car, MEDIUM default, dynamic resolution) has never been measured on hardware.

## 4. Moving dark shape (sky) and shadows
`docs/handoff.md` A3: the moving dark shape was NOT a projected shadow (shadow casting is OFF); suspected the camera-following skyline ring, unconfirmed. Reproduce with screenshots at several camera angles, find the real cause, then decide whether shadows can come back (texel-snapped rig exists in `world/shadowRig.ts`).

## 5. Review the blind Qwen work for 058-062 (when the queue runs)
Task 060 (asphalt shader via `onBeforeCompile`, noise DataTexture, puddles) is the risky one: verify visually in CLEAR/RAIN/SNOW, no darkening in snow, mobile cost. 059 guessed which boxes are "the blue obstacles"; 061 builds the garage shell blind. Use `/review-qwen NNN`, screenshots downscaled to <= 1280 px, `scripts/with-dev.sh`.

## 6. Audio realism
Engines are procedural only (AudioWorklet + oscillator fallback); `docs/audio-todo.md` lists the recordings that would make them convincing, and the sample pipeline (`data/engineSounds`, `audio/engineSamples`) is built and idle. No samples until Carlos says yes (then log in `docs/assets/licenses.md`). The turbo audio is LOCKED. Real-device loudness check missing (`npm run audio:level` is synthetic).

## 7. AI races
Known: rivals still get lifted back after 9 s pins 2-4 times per 8-car race (AI unstick). Free races are at full skill in the player's tier; check they are beatable on every map and weather, not just "not stuck" (`tests/field-check`, `ai-levels-check`). Rubber band capped at 9 %.

## 8. Structural debt
- Files at the 220-line wall: `game/game.ts` (219), `main.ts` (~218), `core/raceManager.ts` (218): extract before any feature touches them.
- Open world (`src/world/roads/`, `types/world.ts`, GameState `'FREEROAM'`) was started and abandoned: pure code only, nothing wired, no tests. Decide: finish or delete.
- Real GLB car bodies (Tripo free tier) are still absent; procedural fallback is what ships. The GLB path was only tested with a synthetic mesh. Models 046-055 came from Blender scripts (`blender/cars/*.py`); no more visual work on existing cars (owner decision).
- `visual-check.mjs` flakiness: make it deterministic (fixed seeds/time, warm-up frames) so it can gate Qwen tasks.

## 9. Content and polish queue
Native review of the Spanish (Spain) text, Chapter 3 (outline only in `docs/story.md`), people models (Qwen 056 pending, `tests/qwen/people-models-check.mts`), subtitles/minimap size settings (wired, awaiting task 062), main-menu framing (see "Unfinished" above).

## How to work
Token discipline from CLAUDE.md applies (no cat, grep first, `npm run build:q` / `test:q`). One block at a time, `/checkpoint` after each, push after every block. Start with #1, then #3, then #2.
