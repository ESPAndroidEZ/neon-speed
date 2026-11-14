# Architecture

Updated: 2026-11-14. Keep this in sync with the code (`/sync-docs`).

## Data flow
```
KeyboardInput.sample -> CarInput
Engine fixed 1/60 s:  CarController.step(input, weather) -> TrackContact.update(car) -> LapCounter.update
Engine per frame:     CarController.readPose(alpha) -> car mesh + ChaseCam.step/update -> Hud.update
CINEMATIC: CinematicCam drives the camera, hands over to ChaseCam.pose; then state = RACING
```

## Modules (src/)
- `types/game.ts`: ALL shared contracts (CarInput, CarState, WeatherProfile, TrackSample, AIRacerAgent, CameraRig ...).
- `core/`: `engine` (renderer, bloom, fixed loop), `math`, `rng` (seeded), `lapCounter` (sequential progress, no shortcuts).
- `physics/` (pure TS, no three): `carController` (bicycle model, friction circle, handbrake, nudge for impacts),
  `drivetrain` (6-speed auto, reverse, nitro), `tire`, `driftScorer`, `weather` (grip multipliers),
  `trackContact` (verge grip loss, barrier bounce with 4 corners, place/reset on track), `carTuning`.
- `world/`: `track` (pure Catmull-Rom closed track, even spacing), `trackQuery` (nearest sample, lateral offset),
  `harborLoop` (the circuit), `ribbon`/`trackMesh` (road, kerbs, barriers, neon caps), `city` (instanced
  buildings), `streetFurniture` (lamps, light pools, neon signs), `harbor` (quay, containers, cranes, water),
  `envMap` (fake neon reflection probe), `worldLook` (WeatherProfile -> materials), `world` (assembler).
- `data/cars.ts`: car specs (real names only here), CarTuning overrides, BodyShape, prices, paints.
- `world/carBody` + `proceduralCar`: low-poly body from a BodyShape, spinning/steering wheels, lights, underglow, pitch/roll.
- `camera/`: `cinematicCam` (intro), `chaseCam` (gameplay), shots helpers.
- `input/keyboard`, `ui/hud`, `dev/tuningPanel` (backtick), 

## Contracts and conventions
Car space +Z nose, +X left, steer > 0 = left, forward = (sin h, 0, cos h). Track lateral offset + = left.
Physics steps at fixed 1/60 s only; no allocation per step; every .ts file under 220 lines.

## Tuning knobs
`CarTuning` (physics/carTuning.ts) and `ChaseTuning` (camera/chaseCam.ts): all live in the backtick panel.
Weather grip in `physics/weather.ts`. Track geometry is the control list in `world/harborLoop.ts`.

## Dev shortcuts
`?skip` skips the intro, `?w=rain|snow` starts in that weather. `npm test` runs every `tests/*.mts`.
