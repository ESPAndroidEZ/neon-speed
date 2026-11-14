# Handoff

Updated: 2026-11-14 (Claude, block 1).

## Done
Scaffold, `src/types/game.ts` contracts, `src/core/engine.ts` (fixed 60 Hz loop, bloom), `src/core/math.ts`, cinematic camera (`src/camera/*`), throwaway `src/dev/smokeScene.ts`, bootstrap `src/main.ts`. Build is green.

## Next (Claude)
Phase 1: `src/physics/carController.ts`, `src/camera/chaseCam.ts`, `src/input/keyboard.ts`, tuning panel, real `src/main.ts`. Exit test: drifting a box car for 5 minutes is fun. Then phase 2 (see `docs/plan.md`).

## Qwen queue (run with `scripts/qwen.sh <number>`)
- 001 `src/world/assetLoader.ts`
- 002 `src/physics/aiRacers.ts`
- 003 `src/ui/touchControls.ts`

## Open contract requests
None.

## Log (newest last)
- 2026-11-14 Claude: block 1 done. Tasks 001-003 written.
