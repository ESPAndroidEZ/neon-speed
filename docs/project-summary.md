# Neon Speed: project summary

Updated 2026-11-15 (after session 8).

## What it is
A 3D arcade street racer in the browser (TypeScript, Three.js, Vite; Capacitor iOS/Android later). Night city, neon,
rain and snow that really change grip, drifting, nitro and a turbo. Free Chapter 1 demo first: one tight street
circuit ("Kestrel Bay Streets", 1.35 km), eight cars, AI rivals, a four-event story ("Wet Asphalt"). Session 5 added four more maps (Neon Strip, Container Maze, Cliffside Run sprint with hills, a drift yard), Chapter 2 "Redline Rising" with a branching choice, portraits and a versus screen, weight-transfer driving with assists, gamepad and touch, and a racing-line AI with four difficulty levels. Session 8 (2026-11-15): approved handbrake handling (momentum carry + drift hold), wider city corners, corner guide HUD, launch timing, nitro rewards (near miss, slipstream, clean corner), best-lap ghost, number plates, rebuilt phone controls, three German cars (Golf IV GTI, 535d Touring E61, M3 E46), competitive free races, Blender car models built by Qwen.

## Status per phase (`docs/plan.md` has the table)
- 0 Foundation, 1 Drive, 2 Track and city, 3 Cars and AI, 4 Juice and audio: done.
- 5 Progression: garage, cash, paint, underglow, saves (5 slots), story career, upgrades + tuning advice done; more event types todo.
- 6 Mobile: touch controls (gas/brake right, nitro/handbrake left), phone quality defaults, dynamic resolution done; Capacitor builds untested on devices. 7 Ship (tutorial, TestFlight): todo.

## Look and install
Three look presets (Neon Night, Dusk Heat, Overcast Grit) switch in Settings or with `?look=neon|dusk|grit`; graphics presets Low/Medium/High/Ultra plus 11 options and a device benchmark in Settings. Install on phones: `docs/mobile.md` (PWA from the browser, or Capacitor android/ and ios/ projects). Garage: Appearance panel and Tuning screen (PR class D-S, 11 upgrade categories with advice and measured next-level gains, your best lap per exact setup, setup sliders, dyno). Settings has "Unlock all cars (free test)".

## Run
`npm install`, `npm run dev` (http://localhost:5173), `npm run build` (line limit + code-health + tsc + vite),
`npm test` (40 headless test files), `npm run smoke` (browser console-error check), `npm run visual`
(Playwright screenshots in CLEAR/RAIN/SNOW with luminance, clipping and contrast assertions), `node scripts/car-shots.mjs`.

## Controls
W/S gas and brake (brake from a stop reverses), A/D steer, Space handbrake, Shift nitro, R reset to track, 1/2/3 weather,
M mute, Esc pause (Resume, Restart, Save, Save & Quit), P particle showcase, K audio test panel, backtick tuning panel.
Phone: GAS/BRAKE pedals right, NITRO/HANDBRAKE left above a drag-to-steer zone (on WSL run `scripts/phone-access.ps1` once to reach the dev server). Dev URL flags: `?skip ?demo ?ai=3 ?car=evo ?w=rain ?at=tunnel ?ff=10 ?track=neon|maze|cliff|maze-drift ?event=c2-neon ?screen=garage|story|crew|maps ?showcar=supra&angle=side`. Gamepad: left stick + triggers, A/X handbrake, RB/B nitro, Start pause, Y reset.

## Architecture in 10 lines (details: `docs/architecture.md`)
1. `src/types/game.ts` holds every shared contract (CarInput, CarState, WeatherProfile, AIRacerAgent, Serializable...).
2. `src/physics` is pure TS at a fixed 1/60 s step: bicycle-model car, friction circle, drivetrain with turbo and nitro, surfaces.
3. `src/core` has the engine loop, race manager, lap counter, save store, quality tiers, weather grade.
4. `src/world` builds the city from a street polygon: road, facades, tunnel, bridge, dock, props, procedural cars or GLBs.
5. `src/game` orchestrates (states MENU, CINEMATIC, RACING, PODIUM; pause; story controller; radio).
6. `src/fx` is pooled particles, skid marks, headlights and the final post pass; `src/audio` is procedural Web Audio.
7. `src/ui` is plain DOM (HUD, menus, garage, dialogue, pause, load).
8. `src/data` is content: cars (real brand names ONLY here), rivals, story, lore, radio.
9. Cars load `public/models/<id>.glb` when present (Blender scripts in `blender/cars/` built by Qwen, or a Tripo download), else the lofted procedural body.
10. Everything stateful implements `Serializable`; a restored race runs identically (tested).

## Save system
`SaveStore` (cash, cars, paint, best laps, settings, story career) and `SaveSlots` (5 manual slots, overwrite asks first, + autosave of a race in
progress, versioned JSON with a migration table). Esc pauses and autosaves; Continue and Load restore the exact state.
Corrupt or future-version data is rejected without crashing.

## Settings
Volume (master, effects, music), mute, DJ Switch voice, camera shake (off/low/normal), rain/snow physics (normal /
aggressive / extreme), graphics quality (low/medium/high/ultra) with auto quality: dynamic resolution first (to 60 %), then a tier drop; phones start on Medium once.

## Locked decisions (CLAUDE.md "Owner decisions")
Turbo model and its audio, the rain/snow physics, the save system and the camera shake fix are approved: do not change.
Sound is procedural only; no samples without Carlos's yes. Session 8 added: the handbrake handling, phone control layout, eight cars in four tiers, competitive free races (see CLAUDE.md).

## Known issues
- AI is far off a skilled human: the owner laps Container Maze in ~40 s with handbrake turns, the AI ~65 s (it now uses handbrake turns too, but plans them poorly). Some upgrades make the AI slower (`tests/lab/upgrade-impact.mts`).
- Car models: Evo, Supra and 350Z are Blender models from Qwen; RX-7 is an older Blender model; Civic is procedural; Golf, E61 and M3 are being built (tasks 053-055). No more visual work on existing cars (owner).
- The headless GPU is software (SwiftShader): bloom and fog look different on a real GPU, and a full lap cannot be played in the headless browser (the `?demo` driver never finishes laps).
- Sound quality is unjudged by the author (no ears): use the K panel presets.

## What is next
AI handbrake driving model (close the gap to a skilled human), instant replay, the Qwen car models 053-055, device testing on iPhone, then tutorial and ship polish (phase 7).
