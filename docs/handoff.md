# Handoff

Baton: claude
(One agent works at a time. The baton holder works; the other waits. Claude's /checkpoint passes it to Qwen when asked; scripts/qwen.sh returns it.)

Updated: 2026-11-14 (Claude, block 2).

## Done
Scaffold, `src/types/game.ts` contracts (now with `Weather`, `WeatherProfile`), `src/core/engine.ts`, `src/core/math.ts`, cinematic camera (`src/camera/*`), throwaway `src/dev/smokeScene.ts`, bootstrap `src/main.ts`.

## Physics (tested headless: `npx tsx tests/physics-check.mts`, all pass)
`src/physics/`: `carController.ts` (bicycle model, friction circle, handbrake, drift scoring), `drivetrain.ts` (6-speed auto, reverse, nitro), `tire.ts`, `carTuning.ts` (all tunable numbers), `weather.ts` (CLEAR 1.0 / RAIN 0.72 / SNOW 0.45 grip).

## Next (Claude)
1. Build `src/camera/chaseCam.ts`, `src/input/keyboard.ts`, `src/ui/hud.ts`, `src/dev/tuningPanel.ts` (live sliders, backtick key), real `src/main.ts` (keys: R reset, 1/2/3 weather).
Exit test: drifting a box car for 5 minutes is fun. Then phase 2 (see `docs/plan.md`).

## Qwen queue (run with `scripts/qwen.sh <number>`)
- 001 `src/world/assetLoader.ts`
- 002 `src/physics/aiRacers.ts`
- 003 `src/ui/touchControls.ts`

## Open contract requests
None.

## Log (newest last)
- 2026-11-14 Claude: block 1 done. Tasks 001-003 written.
- 2026-11-14 Claude: physics build ok, tests/physics-check.mts passes, carTuning tuned (brake force now scales with weather grip).
