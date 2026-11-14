# Handoff

Baton: claude
(One agent works at a time. The baton holder works; the other waits. Claude's /checkpoint passes it to Qwen when asked; scripts/qwen.sh returns it.)

Updated: 2026-11-14 (Claude, block 2).

## Done
Contracts, engine, cinematic, physics (tested), chase cam, keyboard, HUD, tuning panel (Phase 1).
Track + city (Phase 2): Harbor Loop (1.4 km), road/kerbs/barriers, instanced city, lamps, neon, harbour, wet/snow look, barrier + verge contact, lap counter, R = reset to track. Tests: `npm test`.

## Next (Claude, big block in order)
2 procedural cars + data/cars.ts, 3 race flow, 4 juice + audio, 5 menu + progression, 6 docs + Qwen tasks.

## Qwen queue (run with `scripts/qwen.sh <number>`)
- 001 `src/world/assetLoader.ts`
- 002 `src/physics/aiRacers.ts`
- 003 `src/ui/touchControls.ts`
- 004 `src/world/weatherFx.ts` (rain/snow; hook into main.ts after merge)

## Open contract requests
None.

## Log (newest last)
- 2026-11-14 Claude: block 1 done. Tasks 001-003 written.
- 2026-11-14 Claude: physics build ok, tests/physics-check.mts passes, carTuning tuned (brake force now scales with weather grip).
- 2026-11-14 Claude: chaseCam, keyboard, hud, tuningPanel, main.ts (Phase 1) built. Task 004 written. Needs playtest.
- 2026-11-14 Claude: step 1 track + city done (world/, trackContact, lapCounter, tests/track-check, collision-check). architecture.md and sync-docs skill added.
