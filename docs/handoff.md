# Handoff

Baton: claude
(One agent works at a time. The baton holder works; the other waits. Claude's /checkpoint passes it to Qwen when asked; scripts/qwen.sh returns it.)

Updated: 2026-11-14 (Claude, feedback round 2 done).

## Done
Contracts, engine, cinematic, physics (tested), chase cam, keyboard, HUD, tuning panel (Phase 1).
Track + city (Phase 2): Harbor Loop (1.4 km), road/kerbs/barriers, instanced city, lamps, neon, harbour, wet/snow look, barrier + verge contact, lap counter, R = reset to track. Tests: `npm test`.

Cars (step 2): Civic/350Z/Supra in data/cars.ts with tuning overrides (tests/cars-check), procedural body + wheels.

Race flow (step 3): RaceManager (grid, 3-2-1, 3 laps, timing, positions, cash payout), car-car collision, results screen, Game orchestrator (src/game/). Zero AI = time trial. tests/race-check uses a test-only pilot as stand-in AI.

Juice + audio (step 4): src/fx/ (smoke, skid marks, sparks, nitro flames, speed streaks, shake) and src/audio/ (engine, turbo, squeal, nitro, thump, rain/wind, synthwave music, M mute). Audio is untested by ear: check levels.

Menu + progression (step 5): title, main, conditions, garage (buy/paint), settings, save (localStorage), quality tiers. tests/save-check.

Feedback round 1, steps 1-2 (GLB pipeline, 5 cars): assetLoader (task 001 done by Claude), modelCar, carFactory, garage rewrite (stats, paint, underglow, yaw calibration), scripts/optimize-models.sh, docs/assets/tripo-brief.md.

Feedback round 1 (all steps): GLB pipeline + 5 cars + garage; Kestrel Bay Streets (narrow street circuit with tunnel, bridge, dock, plaza, alleys, props); AI rivals (aiRacers, rivals.ts); story mode Chapter 1 (career, dialogue, captions, objectives, unlocks); safe-margin UI fixes. Tests: `npm test` (13 files).

## Next (Claude)
Carlos: drop GLBs in `public/models/`, calibrate yaw in the garage, send playtest notes (AI pace, track feel, story text). Then: wire Qwen modules after `/review-qwen`; car upgrades (plan phase 5); Capacitor (phase 6).

## Qwen queue (run with `scripts/qwen.sh <number>`)
- 003 `src/ui/touchControls.ts` (touch overlay; `setVisible` hidden in menus)
- 005 `src/ui/minimap.ts` (track outline + racer dots, bottom-left)
- 006 `src/input/gamepad.ts` (Gamepad API input source)
- 007 `src/audio/cityAmbience.ts` (harbour horn, siren, water, drips, tunnel muffling)
Done by Claude instead: 001 asset loader, 002 AI racers, 004 weather FX.

## Open contract requests
None. Contract changes logged: `Serializable<T>` (snapshot/restore) added to src/types/game.ts and `AIRacerAgent` extends `Partial<Serializable>` (round 3 save system); `GameState` gained `'MENU'` (step 5); `AIWorldView` gained `grip` (weather grip for the AI, feedback round 1).

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
- 2026-11-14 Claude: feedback round 1 done: GLB pipeline, 5 cars, Kestrel Bay Streets, AI rivals, story mode chapter 1, UI margins. Contract change: AIWorldView.grip. Qwen queue now 004, 003, 005, 006, 007.
- 2026-11-14 Claude: round 2 steps 1-3: graphics pass (material upgrade, glow, headlight spots, env, shafts, FinalFx, tiers + auto quality, prop GLB pipeline), particles (weatherFx, tyre/exhaust/skid fx, showcase P), weather physics levels (NORMAL/AGGRESSIVE/EXTREME, puddles, snow banks, ice, ramp-in), turbo model + drive events.
- 2026-11-14 Claude: round 2 done: graphics pass, particles, weather physics levels, turbo + audio rebuild (worklet), lore, radio, crew screen, Red Hand Wall. Qwen queue unchanged except 004 (done by Claude). Code-health check added to the build.
