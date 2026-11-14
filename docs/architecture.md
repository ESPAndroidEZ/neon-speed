# Architecture

Updated: 2026-11-14. Keep this in sync with the code (`/sync-docs`).

## Data flow
```
KeyboardInput.sample -> CarInput (player)
Engine fixed 1/60 s: Game.fixed -> RaceManager.step: per racer [agent.decide | player input] -> CarController.step
                     -> TrackContact.update (verge, barriers) -> car-car resolveCarPair -> LapCounter -> finish/results
Engine per frame:    RacerViews.update(alpha) (interpolated poses + wheel/body anim) -> ChaseCam -> Hud
Game.state: MENU (showroom orbit cam, Menu DOM) -> CINEMATIC (CinematicCam, then handover to ChaseCam.pose) -> RACING -> PODIUM (ResultsScreen)
RaceManager.phase: GRID -> COUNTDOWN (3-2-1, cars locked) -> RACING -> FINISHED
```

## Modules (src/)
- `types/game.ts`: ALL shared contracts (CarInput, CarState, WeatherProfile, TrackSample, AIRacerAgent, CameraRig ...).
- `core/`: `engine` (renderer, bloom, fixed loop), `math`, `rng`, `lapCounter` (sequential progress, no shortcuts),
  `raceManager` (grid, countdown, laps, timing, finish; takes AIRacerAgent[], works with none), `raceResult` (positions, cash).
- `game/`: `game` (state machine, race + cameras + HUD), `racerViews` (one visual car per racer), `showroomCam` (menu orbit).
- `physics/` (pure TS, no three): `carController` (bicycle model, friction circle, handbrake, nudge for impacts),
  `drivetrain` (6-speed auto, reverse, nitro), `tire`, `driftScorer`, `weather` (grip multipliers),
  `carCollision` (car-car, 2 circles each), `trackContact` (verge grip loss, barrier bounce with 4 corners, place/reset on track), `carTuning`.
- `world/`: `track` (pure Catmull-Rom closed track, even spacing), `trackQuery` (nearest sample, lateral offset),
  `harborLoop` (the circuit), `ribbon`/`trackMesh` (road, kerbs, barriers, neon caps), `city` (instanced
  buildings), `streetFurniture` (lamps, light pools, neon signs), `harbor` (quay, containers, cranes, water),
  `envMap` (fake neon reflection probe), `worldLook` (WeatherProfile -> materials), `world` (assembler).
- `data/cars.ts`: car specs (real names only here), CarTuning overrides, BodyShape, prices, paints.
- `world/carBody` + `proceduralCar`: low-poly body from a BodyShape, spinning/steering wheels, lights, underglow, pitch/roll.
- `core/save` (SaveStore: cash, owned cars, paint, best lap per weather, settings; sanitising parse, injectable storage),
  `core/quality` (low/medium/high render scale + bloom).
- `ui/`: `menu` (title, main, conditions), `garage` (cars, paint, buy), `settings` (volume, mute, quality), `uiKit` (CSS + helpers), `hud`, `results`.
- `fx/`: `particles` (pooled billboards), `skidMarks` (ring-buffer quads), `speedPass` (radial streaks composer pass),
  `juice` (smoke, skids, sparks, nitro flames, shake, bloom kicks; reads Game.views / Game.impact).
- `audio/`: `audioBus` (context, volume, mute, noise), `engineSynth` (rpm/load engine, turbo, blow-off), `sfx` (squeal, nitro,
  rain/wind beds, thump), `musicPatterns` (pure notes) + `music` (scheduler, layers by speed), `audioManager` (feeds all; M = mute).
- `camera/`: `cinematicCam` (intro), `chaseCam` (gameplay), shots helpers.
- `input/keyboard`, `ui/hud`, `ui/results`, `dev/tuningPanel` (backtick), 

## Contracts and conventions
Car space +Z nose, +X left, steer > 0 = left, forward = (sin h, 0, cos h). Track lateral offset + = left.
Physics steps at fixed 1/60 s only; no allocation per step; every .ts file under 220 lines.

## Tuning knobs
`CarTuning` (physics/carTuning.ts) and `ChaseTuning` (camera/chaseCam.ts): all live in the backtick panel.
Weather grip in `physics/weather.ts`. Track geometry is the control list in `world/harborLoop.ts`.

## Dev shortcuts
`?screen=garage|weather|settings` opens a menu screen; `?skip` / `?demo` bypass the menu. `?skip` skips the intro, `?demo` self-driving input, `?ff=N` simulates N s before rendering, `?w=rain|snow` starts in that weather, `?car=350z|supra`. `npm test` runs every `tests/*.mts`.
