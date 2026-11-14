# Handoff

Baton: claude
(One agent works at a time. The baton holder works; the other waits. Claude's /checkpoint passes it to Qwen when asked; scripts/qwen.sh returns it.)

Updated: 2026-11-14 (Claude, block 2).

## Done
Contracts, engine, cinematic, physics (tested), chase cam, keyboard, HUD, tuning panel (Phase 1).
Track + city (Phase 2): Harbor Loop (1.4 km), road/kerbs/barriers, instanced city, lamps, neon, harbour, wet/snow look, barrier + verge contact, lap counter, R = reset to track. Tests: `npm test`.

Cars (step 2): Civic/350Z/Supra in data/cars.ts with tuning overrides (tests/cars-check), procedural body + wheels. C key cycles cars until the garage exists.

Race flow (step 3): RaceManager (grid, 3-2-1, 3 laps, timing, positions, cash payout), car-car collision, results screen, Game orchestrator (src/game/). Zero AI = time trial. tests/race-check uses a test-only pilot as stand-in AI.

Juice + audio (step 4): src/fx/ (smoke, skid marks, sparks, nitro flames, speed streaks, shake) and src/audio/ (engine, turbo, squeal, nitro, thump, rain/wind, synthwave music, M mute). Audio is untested by ear: check levels.

Menu + progression (step 5): title, main, conditions, garage (buy/paint), settings, save (localStorage), quality tiers. tests/save-check.

## Next (Claude, big block in order)
6 docs + Qwen tasks (then playtest).

## Qwen queue (run with `scripts/qwen.sh <number>`)
- 001 `src/world/assetLoader.ts`
- 002 `src/physics/aiRacers.ts`
- 003 `src/ui/touchControls.ts`
- 004 `src/world/weatherFx.ts` (rain/snow; hook into main.ts after merge)

## Open contract requests
None. Contract change logged: `GameState` gained `'MENU'` (src/types/game.ts), step 5.

## Log (newest last)
- 2026-11-14 Claude: block 1 done. Tasks 001-003 written.
- 2026-11-14 Claude: physics build ok, tests/physics-check.mts passes, carTuning tuned (brake force now scales with weather grip).
- 2026-11-14 Claude: chaseCam, keyboard, hud, tuningPanel, main.ts (Phase 1) built. Task 004 written. Needs playtest.
- 2026-11-14 Claude: step 1 track + city done (world/, trackContact, lapCounter, tests/track-check, collision-check). architecture.md and sync-docs skill added.
- 2026-11-14 Claude: step 2 cars done (data/cars.ts, carBody, proceduralCar, applyTuning). smokeScene deleted.
- 2026-11-14 Claude: step 3 race flow done (raceManager, raceResult, carCollision, results UI, game/game.ts replaces main wiring).
- 2026-11-14 Claude: step 4 juice + audio done (fx/, audio/, tests/audio-check).
- 2026-11-14 Claude: step 5 menu + progression done (ui/menu, garage, settings, core/save, quality). Contract: GameState += 'MENU'.
