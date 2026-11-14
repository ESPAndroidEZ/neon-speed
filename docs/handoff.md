# Handoff

Baton: claude
(One agent works at a time. The baton holder works; the other waits. Claude's /checkpoint passes it to Qwen when asked; scripts/qwen.sh returns it.)

Updated: 2026-11-14 (Claude, big block done).

## Done
Contracts, engine, cinematic, physics (tested), chase cam, keyboard, HUD, tuning panel (Phase 1).
Track + city (Phase 2): Harbor Loop (1.4 km), road/kerbs/barriers, instanced city, lamps, neon, harbour, wet/snow look, barrier + verge contact, lap counter, R = reset to track. Tests: `npm test`.

Cars (step 2): Civic/350Z/Supra in data/cars.ts with tuning overrides (tests/cars-check), procedural body + wheels.

Race flow (step 3): RaceManager (grid, 3-2-1, 3 laps, timing, positions, cash payout), car-car collision, results screen, Game orchestrator (src/game/). Zero AI = time trial. tests/race-check uses a test-only pilot as stand-in AI.

Juice + audio (step 4): src/fx/ (smoke, skid marks, sparks, nitro flames, speed streaks, shake) and src/audio/ (engine, turbo, squeal, nitro, thump, rain/wind, synthwave music, M mute). Audio is untested by ear: check levels.

Menu + progression (step 5): title, main, conditions, garage (buy/paint), settings, save (localStorage), quality tiers. tests/save-check.

Feedback round 1, steps 1-2 (GLB pipeline, 5 cars): assetLoader (task 001 done by Claude), modelCar, carFactory, garage rewrite (stats, paint, underglow, yaw calibration), scripts/optimize-models.sh, docs/assets/tripo-brief.md.

## Next (Claude)
Playtest feedback from Carlos: tune `carTuning.ts`, per-car overrides in `data/cars.ts`, chase cam, audio levels. Then wire Qwen's AI, weather FX and touch controls after `/review-qwen`. Upgrades (plan phase 5) and Capacitor (phase 6) still to do.

## Qwen queue (run with `scripts/qwen.sh <number>`; tasks updated to the final code, in this order)
- 004 `src/world/weatherFx.ts` (rain streaks, snow flakes; hooked from `Game.setWeather` and the frame loop after review)
- 003 `src/ui/touchControls.ts` (touch overlay; `setVisible` hidden in menus)

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
- 2026-11-14 Claude: step 6 docs done; Qwen tasks 002/004/003/001 updated to final code. Baton stays with Claude.
- 2026-11-14 Claude: feedback round 1 steps 1+2: GLB pipeline with procedural fallback, 5 cars (Civic, 350Z, RX-7, Evo VIII, Supra), garage with turntable, stats, paint, underglow, yaw calibration.
