# Handoff

Baton: qwen
(One agent works at a time. The baton holder works; the other waits. Claude's /checkpoint passes it to Qwen when asked; scripts/qwen.sh returns it.)

Updated: 2026-11-14 (Claude, feedback round 3 done).

## Done
Contracts, engine, cinematic, physics (tested), chase cam, keyboard, HUD, tuning panel (Phase 1).
Track + city (Phase 2): Harbor Loop (1.4 km), road/kerbs/barriers, instanced city, lamps, neon, harbour, wet/snow look, barrier + verge contact, lap counter, R = reset to track. Tests: `npm test`.

Cars (step 2): Civic/350Z/Supra in data/cars.ts with tuning overrides (tests/cars-check), procedural body + wheels.

Race flow (step 3): RaceManager (grid, 3-2-1, 3 laps, timing, positions, cash payout), car-car collision, results screen, Game orchestrator (src/game/). Zero AI = time trial. tests/race-check uses a test-only pilot as stand-in AI.

Juice + audio (step 4): src/fx/ (smoke, skid marks, sparks, nitro flames, speed streaks, shake) and src/audio/ (engine, turbo, squeal, nitro, thump, rain/wind, synthwave music, M mute). Audio is untested by ear: check levels.

Menu + progression (step 5): title, main, conditions, garage (buy/paint), settings, save (localStorage), quality tiers. tests/save-check.

Feedback round 1, steps 1-2 (GLB pipeline, 5 cars): assetLoader (task 001 done by Claude), modelCar, carFactory, garage rewrite (stats, paint, underglow, yaw calibration), scripts/optimize-models.sh, docs/assets/tripo-brief.md.

Feedback round 1 (all steps): GLB pipeline + 5 cars + garage; Kestrel Bay Streets (narrow street circuit with tunnel, bridge, dock, plaza, alleys, props); AI rivals (aiRacers, rivals.ts); story mode Chapter 1 (career, dialogue, captions, objectives, unlocks); safe-margin UI fixes. Tests: `npm test` (19 files).

Rounds 2 and 3: graphics pass, particles, weather physics levels, turbo + procedural audio, lore/radio/crew, camera shake fix + setting, pause/save/continue (Serializable), sound rework, smoke test. Details in the Log and the graphics audit below.

## Next (Claude)
When usage is back: read logs/qwen/summary.txt, set Baton: claude, /review-qwen each finished task (005, 003, 007, 006, 008), wire accepted modules (touch controls into main, TIPS/CREW/RADIO data into lore/radio, vinyls into the garage, props into the world).
Carlos: drop GLBs in `public/models/`, calibrate yaw in the garage, judge the new sound (K panel presets) and answer whether tiny CC0 samples are allowed. Then: wire Qwen modules (003, 005, 006, 007) after `/review-qwen`; car upgrades (phase 5); Capacitor (phase 6).

## Qwen queue (unattended: `scripts/qwen-queue.sh`; one task file per number in `docs/tasks/`)
Order: 005 text data (radio, tips, bios), 003 touch controls, 007 vinyl textures, 006 procedural props, 008 extra unit tests.
Backlog (not queued): 009 minimap, 010 gamepad, 011 city ambience.
Logs: `logs/qwen/<task>.log`, one result line per task in `logs/qwen/summary.txt`. Watch: `tail -f logs/qwen/queue.log`.
When Claude resumes: read logs/qwen/summary.txt, set Baton: claude, then /review-qwen each finished task (branches `qwen/<task-file-name>` in the worktree ../racer-qwen; main is never touched by the queue).
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

## Graphics audit (round 3, step 3)
`public/models/` holds no GLBs yet: every car runs on the procedural fallback (console lines `[models] <id>: ...` and a garage badge say so; the garage shows "Put <id>.glb in public/models/"). The GLB path itself was tested with a synthetic GLB in round 1 and its normalisation and material upgrade have unit tests (`tests/model-check`, `tests/graphics-check`); it has NOT been seen with a real Tripo mesh.
| Round 2 item | Status |
|---|---|
| Material upgrade pass (clearcoat body, glass, rubber) | implemented (`world/materialUpgrade`, applied to every GLB car) |
| Procedural PMREM environment | implemented (`world/envMap`: dusk dome, lit blocks, neon boxes); used by cars, road, puddles, ice |
| Wet-road reflections | env reflections on the road (rain), neon streak decals, puddle mirrors; real planar mirror only on High tier in rain (`world/roadMirror`, seen in a headless screenshot as car reflections on the road) |
| Headlight spots + glow | implemented (2 pooled SpotLights on player + nearest rival; additive glow quads front and rear) |
| Light shafts, fog glow | implemented (instanced open cones + glow Points; strength follows weather) |
| Vignette / chromatic aberration / speed blur / grain | implemented (`fx/finalFx`) |
| Quality tiers + auto downgrade | implemented (`core/quality`, test) |
| Props pipeline | lamp, container, kiosk and now sign GLBs are picked up from `public/models/props/`; procedural fallback otherwise |
| Emissive window variety | 3 textures (warm, cool, neon) |
Round 3 additions: procedural cars got smoothed silhouettes (Chaikin-rounded profile), wheel arches, rounded tyres, five-spoke rims with brake discs and calipers, grille, lamp housings and mirrors; the garage stage got key and rim lights.
- 2026-11-14 Claude: round 3 done: camera shake fixed (wheelspin-driven shake and slip yaw wag; setting Off/Low/Normal; `tests/camera-check`), pause/save/continue with 3 slots + autosave (Serializable contract, determinism round-trip test), model status badge + procedural car upgrade, graphics audit, sound rework (engine DSP voicings, squeal presets, ambience bed, scrape/crash, mix), `npm run smoke`. Fixed a startup crash (signSpots) found by the smoke test. Turbo untouched.
- 2026-11-14 Claude: checkpoint after round 3; build green, 19 test files + smoke pass; no git remote, nothing pushed.
- 2026-11-14 Claude: round 4 done: weather visibility grade + `npm run visual`, lofted procedural cars, project summary, Qwen queue script and tasks; Baton: qwen, queue started. No git remote.
