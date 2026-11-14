# Architecture

Updated: 2026-11-14 (session 5). Keep this in sync with the code (`/sync-docs`).

## Data flow
```
KeyboardInput.sample -> CarInput (player)
Engine fixed 1/60 s: Game.fixed -> RaceManager.step: per racer [agent.decide | player input] -> CarController.step
                     -> TrackContact.update (verge, barriers) -> car-car resolveCarPair -> LapCounter -> finish/results
Engine per frame:    RacerViews.update(alpha) (interpolated poses + wheel/body anim) -> ChaseCam -> Hud
AI: rivals trade soft bumps (`core/raceContacts`, strength 0.12), contact with the player is a full mass-based crash. `AIWorldView.grip` carries the weather grip. A rival that gains no ground for 9 s is lifted back onto the road.
Game.state: MENU (showroom orbit cam, Menu DOM) -> CINEMATIC (CinematicCam, then handover to ChaseCam.pose) -> RACING -> PODIUM (ResultsScreen)
RaceManager.phase: GRID -> COUNTDOWN (3-2-1, cars locked) -> RACING -> FINISHED
```

## Modules (src/)
- `types/game.ts`: ALL shared contracts (CarInput, CarState, WeatherProfile, TrackSample, AIRacerAgent, CameraRig ...).
- `core/`: `engine` (renderer, bloom, fixed loop), `math`, `rng`, `lapCounter` (sequential progress, no shortcuts),
  `raceManager` (grid, countdown, laps, timing, finish; takes AIRacerAgent[], works with none), `raceResult` (positions, cash).
- `game/`: `game` (state machine, race + cameras + HUD, story hooks), `racerViews` (one visual car per racer), `showroomCam` (menu orbit),
  `story` (StoryController: chapter flow, dialogue, objectives, rewards, unlocks), `weatherApply`, `telemetry`.
- `physics/` (pure TS, no three): `carController` (bicycle model, friction circle, handbrake, nudge for impacts),
  `drivetrain` (6-speed auto, reverse, nitro), `tire`, `driftScorer`, `weather` (grip multipliers),
  `carCollision` (car-car, 2 circles each), `obstacles` (static circles by sample), `trackContact` (verge grip loss, wall + obstacle bounce on 12 body points, place/reset on track), `carTuning`.
- `world/` track (pure): `streetPath` (street polygon with rounded corners -> dense path tagged by zone and width), `track`
  (even resampling, per-sample width, wall offset and zone, rotated so index 0 is the start line), `kestrelBay` (the circuit:
  vertex list + plaza), `trackQuery` (nearest sample, lateral offset), `propsLayout` (parked cars with collision circles, cones,
  manholes, crosswalks, steam vents; deterministic).
- `world/` meshes: `ribbon` (road/wall strips with per-sample offsets), `trackMesh` (worn asphalt, sidewalks, ground), `facades`
  (continuous flush buildings, windows, lit shopfronts, plaza rim), `tunnelBridge`, `dock` (containers, cranes, water),
  `props`, `stage` (garage stage far from the street, used by the showroom), `furniture` (wall lamps + light pools, neon signs, overhead cables), `steam`, `envMap`, `worldLook` (weather ->
  materials), `world` (assembler), `textures`.
- `data/story.ts` (events, dialogue, opening captions), `data/rivals.ts` (rivals, fields), `physics/aiRacers` (profile-based driver: speed profile from curvature, grip and skill; pure pursuit).
- `data/cars.ts`: 5 car specs (real names only here), CarTuning overrides, BodyShape, model config, prices, paints, underglow colours.
- `physics/carStats`: headless 0-100 / top speed / slide measurement used by the garage bars and tests.
- `world/carBody` + `proceduralCar`: low-poly body from a BodyShape, spinning/steering wheels, lights, underglow, pitch/roll.
- `world/assetLoader` (GLB normalise: long axis Z, scale, ground, yaw; body-material finder), `modelCar` (CarVisual for baked GLBs, no wheel spin, calibration arrow),
  `carFactory` (procedural first, upgraded to public/models/<id>.glb when it loads), `modelPrefs` (yaw fixes in localStorage).
- `core/career` (story progress, objective evaluation, unlocks; pure), `core/save` (SaveStore: cash, owned cars, paint, underglow, best lap per weather, settings, career; sanitising parse, injectable storage),
  `core/quality` (low/medium/high render scale + bloom).
- `ui/`: `menu` (title, main, story, free race, garage, settings), `storyMenu` (chapter cards, ending), `dialogue` (speaker cards, subtitles, optional speech),
  `garage` (turntable, stats, paint, underglow, buy, GLB yaw calibration), `settings`, `uiKit`, `hud`, `results` (objective verdict + buttons).
- Round 2 additions: `fx/` tyreFx (smoke / spray / powder by weather + fading skid marks), exhaustFx (nitro cone, backfire on lift and shifts, from `physics/driveEvents`), headlights (2 pooled SpotLights), finalFx (speed blur, aberration, vignette, grain); `world/weatherFx` (rain, ripples, snow, wind lines), `world/materialUpgrade`, `carLights`, `roadMirror` (High tier, rain), `propModels` (optional prop GLBs), `surfaceVisuals`, `redHandWall`, `wallArt`; `physics/weatherLevels` (grip per level, PhysicsEnv), `surfaces` (puddles, banks, ice), `driveEvents`; `core/quality` (tiers, AutoQuality); `game/radio` (RadioDirector), `data/lore`, `data/radio`; `ui/titleCards`, `crewMenu`, `loadingCard`; `audio/engineDsp` (pure synth, shipped to an AudioWorklet as text), `engineVoice`, `turboSound`, `rivalEngines`, `audioParams`; `dev/audioTestPanel` (K).
- `fx/`: `particles` (pooled billboards), `skidMarks` (ring-buffer quads), `speedPass` (radial streaks composer pass),
  `juice` (smoke, skids, sparks, nitro flames, shake, bloom kicks; reads Game.views / Game.impact).
- `audio/`: `audioBus` (context, volume, mute, noise), `engineSynth` (rpm/load engine, turbo, blow-off), `sfx` (squeal, nitro,
  rain/wind beds, thump), `musicPatterns` (pure notes) + `music` (scheduler, layers by speed), `audioManager` (feeds all; M = mute).
- `camera/`: `cinematicCam` (intro), `chaseCam` (gameplay), shots helpers.
- `input/keyboard`, `ui/hud`, `ui/results`, `dev/tuningPanel` (backtick), 

## Session 5: driving, maps, story, AI
- Driving: `physics/loadTransfer` (weight transfer: braking loads the nose, power the tail, roll transfer costs grip per axle via `rollFront`), per-car cgHeight / rollFront / brakeBias / throttleLag / engineBraking in `CarTuning`, `physics/assists` (BEGINNER / STANDARD / PRO + steering sensitivity; STANDARD = the approved handling), `physics/steering`. Input: `input/combinedInput` merges keyboard (speed-sensitive ramps), gamepad (analog, deadzone, d-pad, rumble) and `ui/touchControls`; `game/inputSetup` wires them.
- Maps: `data/tracks/*.ts` (TrackDef: vertices, start, laps, propsDensity, weather, elevation, sprintEnd, driftTarget), `buildTrack(def)`; `Track` has `heights` (visual elevation: `TrackContact.groundY/pitch`, chase cam follows) and `raceSamples` (sprint distance). `world.load(def)` swaps maps; `world/worldParts` composes a theme (city / port `yard` / cliff `cliffside`). `world/trackValidate` is the headless validator. UI: `ui/trackSelect`, `game/freeRace` (per-map bests in `trackBest`).
- Story: `data/story2*.ts` (chapter 2), branching `Line.choice`, story flags + relationships in `career` (saved), `ui/portraits` + `data/characters` (2D faces, moods), `ui/versus`, `game/versusGate`, `world/characters` + `game/cast` (3D figures).
- AI: `physics/aiLine` (apex line by relaxation, speed profile), `aiTraffic` (slipstream, dive-bomb, defence), `aiDifficulty` (ROOKIE..LEGEND, personalities, capped rubber band), `aiRacers` (the agent). Same physics and grip as the player.
- Tests added: handling, contact, balance (lap-time bands, class order), tracks, ai-tracks, ai-levels, story2, text-data.

## Visual checks and cars (round 4)
`core/grade` holds the per-weather look (exposure, bloom, colour grade, glow and spot scales) applied by `game/weatherApply`; `scripts/visual-check.mjs` (Playwright) asserts luminance, clipping and contrast in CLEAR/RAIN/SNOW. Procedural cars are lofted: `world/carLoft` (mirrored cross-sections along Z, smooth normals, material groups), `carBody` (stations from the proportion numbers in `data/cars.ts`), `carDetails` (splitter, skirts, wing, scoop, tips, door lines, mirrors, lamps), `carWheels` (rounded tyres, five-spoke rims, discs, calipers, arches).

## Saving and pause
`Serializable<T>` (src/types/game.ts): `snapshot()` returns JSON-safe data, `restore()` puts it back. Implemented by CarController (+ Drivetrain incl. boost and nitro, DriftScorer), LapCounter, RaceManager (`core/raceSnapshot`: timers, racers, AI agents with PRNG state and track index), SurfaceMap (puddle seed). `game/saveGame` captures and restores the whole game (setup meta, weather ramp, plan); `core/gameSave` stores 3 slots + autosave in localStorage with validation, version check and a migration table; `game/pause` + `ui/pauseMenu`, `ui/saveUi` (load screen). `tests/save-roundtrip.mts` proves restore + M steps == M uninterrupted steps.

## Contracts and conventions
Car space +Z nose, +X left, steer > 0 = left, forward = (sin h, 0, cos h). Track lateral offset + = left.
Physics steps at fixed 1/60 s only; no allocation per step; every .ts file under 220 lines.

## Tuning knobs
`CarTuning` (physics/carTuning.ts) and `ChaseTuning` (camera/chaseCam.ts): all live in the backtick panel.
Weather grip in `physics/weather.ts`. Track geometry is the control list in `world/harborLoop.ts`.

## Dev shortcuts
`?screen=garage|weather|settings` opens a menu screen; `?skip` / `?demo` bypass the menu. `?ai=N` rivals, `?at=tunnel|bridge|dock|plaza|alley|<index>` start there, P = particle showcase, K = audio test panel, `?showcase`, `?hands=N`, `?screen=crew`, `?skip` skips the intro, `?demo` self-driving input, `?ff=N` simulates N s before rendering, `?w=rain|snow` starts in that weather, `?car=350z|supra`. `npm test` runs every `tests/*.mts`.
