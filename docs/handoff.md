# Handoff

Baton: qwen
(One agent works at a time. The baton holder works; the other waits. Claude's /checkpoint passes it to Qwen when asked; scripts/qwen.sh returns it.)

Updated: 2026-11-14 (Claude, session 5 done).

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
When the queue finishes: read logs/qwen/summary.txt (EMPTY = the model produced nothing), /review-qwen each of 012-019, then wire them: radio2 -> `game/radio` (TRACK_RADIO start/idle per map, RIVAL_RADIO_2), tips2 -> `ui/loadingCard`, barks -> `ui/versus`, vinylDraw -> garage (vinyl choice per car, saved), propTram/propYard -> `world/worldParts` (Neon / Container Maze), qwen tests -> `npm test`.
Carlos: judge driving feel (questions in the last reply), try the Legend toggle after the story, drop Tripo GLBs for cars (and optionally Dante/Mara, loader hook TODO).
Backlog: car upgrades (phase 5), Capacitor (phase 6), AI wrong-way recovery (rivals still get pinned in crowded fields), city ambience (011, re-split needed).

## Qwen queue (unattended: `scripts/qwen-queue.sh 012 013 014 015 016 017 018 019`; one task file per number in `docs/tasks/`)
Small tasks, ONE file each (see docs/tasks/000-readme.md): 012 radio per map, 013 tips per map, 014 rival barks, 015 vinyl painters, 016 tram stop + shelter props, 017 yard props, 018 AI unit tests, 019 dialogue/career tests.
Logs: `logs/qwen/<task>.log`, one result line per task in `logs/qwen/summary.txt` (state DONE / EMPTY / FAILED / TIMEOUT). Watch: `tail -f logs/qwen/queue.log`.
Old tasks 003/009/010 (merged), 005 (done by Claude), 006/007/008/011 (output limit, nothing committed) are in docs/tasks/done.

## Open contract requests
None. Contract changes logged: session 5: `Track` gained `heights` and `raceSamples`, `Zone` gained boulevard/yard/cliff, `RaceSetup.trackId`, `StoryEvent.chapter/trackId`, `Line.mood/if/unless/choice`; the AI agent contract is unchanged (options go through `createAIRacer`); `Serializable<T>` (snapshot/restore) added to src/types/game.ts and `AIRacerAgent` extends `Partial<Serializable>` (round 3 save system); `GameState` gained `'MENU'` (step 5); `AIWorldView` gained `grip` (weather grip for the AI, feedback round 1).

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
- 2026-11-14 Claude: checkpoint while the Qwen queue runs (005, 003, 007, 006, 008); build green; Baton stays qwen.
- 2026-11-14 Claude (session 5): review of the Qwen queue. 003 touch controls merged and wired (CombinedInput: keyboard + gamepad + touch). 009 minimap and 010 gamepad were already on main from Carlos's commits (qwen branches superseded). 005 text data, 006 props, 007 vinyls, 008 tests, 011 ambience: REJECTED, empty (Qwen hit its 8192-token output limit and committed nothing, yet the queue logged DONE). Claude wrote the 005 content itself (tips.ts, 11 crew bios, radio.ts with win/lose). Lesson: Qwen tasks must be small (<4k tokens of output per file); queue script now flags empty results.
- 2026-11-14 Claude (session 5, step 2): driving. Weight transfer (`physics/loadTransfer`: braking loads the nose, power the tail, roll transfer costs grip per axle via `rollFront`), per-car cgHeight/rollFront/brakeBias/throttleLag/engineBraking, brake-bias friction circle, assists BEGINNER/STANDARD/PRO + sensitivity (`physics/assists`, STANDARD = the approved handling), mass-based car-car collisions with side rub, soft rival bumps, Coulomb wall friction + deflection (no sticking), AI unstick (reverse only at the edge, 8 s lift back), gamepad d-pad/rumble/deadzone, speed-sensitive keyboard ramps. Settings: assists, sensitivity, deadzone, rumble. Tests: handling-check, contact-check, balance-check (lap-time bands + class order Civic > 350Z > RX-7 > Evo > Supra). LOCKED turbo/weather untouched (weather tests green; snow braking ratio -8% inside tolerance).
- 2026-11-14 Claude (session 5, step 3): maps. `src/data/tracks/*.ts` (TrackDef: vertices, start, laps, propsDensity, weather, elevation, sprintEnd, driftTarget), 5 maps (Kestrel, Neon Strip, Container Maze, Cliffside Run sprint, Container Drift), `world.load(def)` swaps the map, theme builders (city / port yard / cliff terrain+rails), visual elevation (car height + pitch + chase cam), track select screen with outlines + best times, per-map bests in the save (`trackBest`), headless validator (`world/trackValidate`) + tests/tracks-check + tests/ai-tracks-check. Contract note: `Track` gained `heights`, `raceSamples`; `Zone` gained boulevard/yard/cliff; `RaceSetup.trackId`.
- 2026-11-14 Claude (session 5, steps 4-5): story + characters + AI. Chapter 2 (6 events, 3 bosses, branching choice with flags/relationships saved), Chapter 3 outline in docs/story.md; portraits with 4 moods, versus screen before every race, 3D low-poly figures (Mara in the garage, rivals at the grid, Dante at the finale), crew screen with relationship bars; AI rebuilt (racing line, slipstream/dive-bomb/defence, 4 difficulty levels with personalities, capped rubber band, Legend after the story). Tests: ai-levels, story2, ai-tracks. Known: rivals still get lifted back after 9 s pins ~2-4 times per 8-car race.
- 2026-11-14 Claude (session 5, step 6): Qwen tasks 012-019 written (small), baton to Qwen, queue started.
