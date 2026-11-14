# Handoff

Baton: claude
(One agent works at a time. The baton holder works; the other waits. Claude's /checkpoint passes it to Qwen when asked; scripts/qwen.sh returns it.)

Updated: 2026-11-14 (Claude, block 2).

## Done
Scaffold, `src/types/game.ts` contracts (now with `Weather`, `WeatherProfile`), `src/core/engine.ts`, `src/core/math.ts`, cinematic camera (`src/camera/*`), throwaway `src/dev/smokeScene.ts`, bootstrap `src/main.ts`.

## Draft, UNTESTED (written, not yet run or tuned)
`src/physics/`: `carController.ts` (bicycle model, friction circle, handbrake, drift scoring), `drivetrain.ts` (6-speed auto, reverse, nitro), `tire.ts`, `carTuning.ts` (all tunable numbers), `weather.ts` (CLEAR 1.0 / RAIN 0.72 / SNOW 0.45 grip).

## Next (Claude)
1. `npm run build`; fix any compile errors in the draft physics.
2. Headless test script (`tests/physics-check.mts`, run with `npx tsx`): 0-100 km/h about 5.5 s, gear order, top speed, no NaN with random input, handbrake drift reaches 0.3+ rad slip and recovers, braking distance longer in rain/snow, determinism, reverse works. Tune `carTuning.ts` until they pass.
3. Then `src/camera/chaseCam.ts`, `src/input/keyboard.ts`, `src/ui/hud.ts`, `src/dev/tuningPanel.ts` (live sliders, backtick key), real `src/main.ts` (keys: R reset, 1/2/3 weather).
Exit test: drifting a box car for 5 minutes is fun. Then phase 2 (see `docs/plan.md`).

## Qwen queue (run with `scripts/qwen.sh <number>`)
- 001 `src/world/assetLoader.ts`
- 002 `src/physics/aiRacers.ts`
- 003 `src/ui/touchControls.ts`

## Open contract requests
None.

## Log (newest last)
- 2026-11-14 Claude: block 1 done. Tasks 001-003 written.
