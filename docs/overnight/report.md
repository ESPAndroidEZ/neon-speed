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
