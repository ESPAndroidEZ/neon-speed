# Racer's Blood: project summary

Updated 2026-11-14 (after session 5).

## What it is
A 3D arcade street racer in the browser (TypeScript, Three.js, Vite; Capacitor iOS/Android later). Night city, neon,
rain and snow that really change grip, drifting, nitro and a turbo. Free Chapter 1 demo first: one tight street
circuit ("Kestrel Bay Streets", 1.4 km), five cars, AI rivals, a four-event story ("Wet Asphalt"). Session 5 added four more maps (Neon Strip, Container Maze, Cliffside Run sprint with hills, a drift yard), Chapter 2 "Redline Rising" with a branching choice, portraits and a versus screen, weight-transfer driving with assists, gamepad and touch, and a racing-line AI with four difficulty levels.

## Status per phase (`docs/plan.md` has the table)
- 0 Foundation, 1 Drive, 2 Track and city, 3 Cars and AI, 4 Juice and audio: done.
- 5 Progression: garage, cash, paint, underglow, saves, story career done; car upgrades and more event types todo.
- 6 Mobile (touch controls, Capacitor) and 7 Ship (tutorial, TestFlight): todo. Touch controls are a Qwen task.

## Run
`npm install`, `npm run dev` (http://localhost:5173), `npm run build` (line limit + code-health + tsc + vite),
`npm test` (19+ headless test files), `npm run smoke` (browser console-error check), `npm run visual`
(Playwright screenshots in CLEAR/RAIN/SNOW with luminance, clipping and contrast assertions), `node scripts/car-shots.mjs`.

## Controls
W/S gas and brake (brake from a stop reverses), A/D steer, Space handbrake, Shift nitro, R reset to track, 1/2/3 weather,
M mute, Esc pause (Resume, Restart, Save, Save & Quit), P particle showcase, K audio test panel, backtick tuning panel.
Dev URL flags: `?skip ?demo ?ai=3 ?car=evo ?w=rain ?at=tunnel ?ff=10 ?track=neon|maze|cliff|maze-drift ?event=c2-neon ?screen=garage|story|crew|maps ?showcar=supra&angle=side`. Gamepad: left stick + triggers, A/X handbrake, RB/B nitro, Start pause, Y reset.

## Architecture in 10 lines (details: `docs/architecture.md`)
1. `src/types/game.ts` holds every shared contract (CarInput, CarState, WeatherProfile, AIRacerAgent, Serializable...).
2. `src/physics` is pure TS at a fixed 1/60 s step: bicycle-model car, friction circle, drivetrain with turbo and nitro, surfaces.
3. `src/core` has the engine loop, race manager, lap counter, save store, quality tiers, weather grade.
4. `src/world` builds the city from a street polygon: road, facades, tunnel, bridge, dock, props, procedural cars or GLBs.
5. `src/game` orchestrates (states MENU, CINEMATIC, RACING, PODIUM; pause; story controller; radio).
6. `src/fx` is pooled particles, skid marks, headlights and the final post pass; `src/audio` is procedural Web Audio.
7. `src/ui` is plain DOM (HUD, menus, garage, dialogue, pause, load).
8. `src/data` is content: cars (real brand names ONLY here), rivals, story, lore, radio.
9. Cars load `public/models/<id>.glb` when present (Tripo free tier), else the lofted procedural body.
10. Everything stateful implements `Serializable`; a restored race runs identically (tested).

## Save system
`SaveStore` (cash, cars, paint, best laps, settings, story career) and `SaveSlots` (3 manual slots + autosave of a race in
progress, versioned JSON with a migration table). Esc pauses and autosaves; Continue and Load restore the exact state.
Corrupt or future-version data is rejected without crashing.

## Settings
Volume (master, effects, music), mute, DJ Switch voice, camera shake (off/low/normal), rain/snow physics (normal /
aggressive / extreme), graphics quality (low/medium/high) with automatic downgrade.

## Locked decisions (CLAUDE.md "Owner decisions")
Turbo model and its audio, the rain/snow physics, the save system and the camera shake fix are approved: do not change.
Sound is procedural only; no samples without Carlos's yes. Cars: Tripo free tier. Props: Meshy free tier.

## Known issues
- No Tripo GLBs have been dropped in yet: every car uses the procedural body (the garage badge says which).
- Sound quality is unjudged by the author (no ears): use the K panel presets. Procedural synthesis has a ceiling.
- The headless GPU is software (SwiftShader): bloom and fog look different on a real GPU; tune by eye on yours.
- The repo has no git remote; nothing is pushed.
- City ambience, vinyls and extra props are not built (small Qwen tasks 012-019 are queued: radio/tips/barks data, vinyl painters, tram and yard props, AI and dialogue tests). Character GLB loading (Tripo) is a TODO; procedural figures are used.
- AI in a crowded field still gets pinned now and then (a lift back onto the road after 9 s); tune by watching a 6-rival race.

## What is next
Real car models, car upgrades (phase 5), touch controls and Capacitor (phase 6), tutorial and polish (phase 7).
Qwen queue (unattended): text data, touch controls, vinyl textures, procedural props, extra unit tests.
