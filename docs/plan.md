# Plan: making this a great game, not just a working one

Last updated: 2026-11-14 (Claude, session 5).

## 1. What "great" means here

A racer is judged in the first 60 seconds of driving. Ranked by how much they matter:

1. **Handling feel.** Drifting must be easy to start, readable, and rewarding to hold. This is 50% of the game.
2. **Sense of speed.** FOV, camera lag, motion streaks, road-edge parallax, wind and engine audio. A 120 km/h car should feel like 250.
3. **Atmosphere.** Wet neon night city, bloom, reflections, underglow, a synth soundtrack.
4. **Progression loop.** Win, earn cash, upgrade and customise, race harder opponents. This keeps people coming back.
5. **Polish.** Menus, transitions, haptics, no hitches on a phone.

Everything else (more cars, more tracks) is content and comes last.

## 2. Principles

- **Vertical slice first.** One track, one car, three opponents, all of it feeling excellent, before any breadth.
- **Tune live.** Every physics, camera and juice constant sits in one tuning object with an in-game panel (lil-gui, dev only). Feel gets found by playing, not by guessing.
- **Physics stays pure TypeScript** (no Three.js inside `carController`), so it can be unit-tested headless. I did this for the camera already; same approach for drift, gearing and collisions.
- **Content is data.** Cars, tracks, upgrades and events are JSON-like objects, so adding content never touches engine code.
- **Original IP.** Original game name, original cars (generic tuners, no real badges), original music. "Inspired by" stays a mood, not a copy.

## 3. Phases (each has an exit test)

| # | Phase | Owner | Exit test | Status |
|---|-------|-------|-----------|--------|
| 0 | Foundation (**done**): contracts, engine, bloom, cinematic intro | Claude | Build green, camera checks pass | done |
| 1 | **Drive**: `carController`, `chaseCam`, keyboard/gamepad input, tuning panel, minimal HUD, flat test arena | Claude | A tester drifts a box car for 5 min and wants to keep going | done |
| 2 | **Track and city** (now Kestrel Bay Streets): spline track, barriers, checkpoints, lap logic, instanced buildings/lamps, wet-road look | Claude (+ Qwen: track data) | One lap of a good-looking circuit at 60 fps on desktop | done |
| 3 | **Cars and AI**: GLB loading, car-car and wall collisions, 3 AI racers, race state machine, podium | Qwen (`assetLoader`, `aiRacers`), Claude (collisions, flow) | A full race against AI is fun, with close finishes | done (race flow, mass-based collisions, 5 cars, AI with racing line, 4 difficulty levels, 5 maps) |
| 4 | **Juice**: tyre smoke and skid marks, sparks, nitro flames and FOV kick, speed lines, procedural engine/turbo/tyre audio, synth music | Claude | Mute vs unmuted, the difference is dramatic | done; round 2 added weather particles, tyre/exhaust fx, showcase (P), turbo audio (needs ear tuning) |
| 5 | **Progression**: garage, cash, 3 upgrade stages, paint, underglow, wheels, vinyl colours, save/load, 3 event types (Circuit, Sprint, Drift) | Split | 30 min session has a reason to start the next race | partial: garage, cash, paint, underglow, save, story chapters 1-2, circuit/sprint/drift events done; upgrades and vinyls todo |
| 6 | **Mobile**: touch controls, perf tiers, Capacitor iOS, safe areas, haptics | Qwen (`touchControls`), Claude (perf) | 60 fps on a mid-range iPhone, one-thumb playable | partial: touch controls and gamepad wired; Capacitor, perf tiers on device todo |
| 7 | **Ship**: menus, tutorial, settings, TestFlight, crash/perf telemetry | Both | 10 outside testers finish the first race unaided | todo |

## 4. The pieces that decide quality

### Handling model (`carController`)
- Bicycle-style model with separate front/rear lateral grip. Grip falls off past a slip angle, which is what lets the tail step out.
- Handbrake cuts rear grip for a moment and adds yaw torque, producing the initiation flick.
- **Drift assist**: a gentle counter-steer and yaw damping while the slip angle is inside a "controllable" window, so drifts are holdable on a keyboard and a thumb.
- Engine: torque curve, 6 gears with real ratios, shift cut, RPM limiter, turbo spool. RPM drives audio and HUD.
- Nitro: tank, burn rate, extra torque, FOV and bloom kick. Refills from drifting, which ties skill to speed.
- Drift scoring: chain multiplier, banked on exit, lost on wall hit.

### Sense of speed
- FOV 60 to 85 with speed, plus a short kick on nitro.
- Chase camera with lag that grows with speed, and a lateral swing that follows the slip angle.
- Radial blur or speed streaks at the screen edges (cheap shader on the composer).
- Dense road-edge props (lamps, posts, signs) so passing objects read at speed.

### The world (cheap enough for a phone)
- Track from a Catmull-Rom control loop; extrude road, kerbs and barriers from it. One draw call per material.
- City via `InstancedMesh`: a handful of building types with emissive window textures, lamp posts, neon signs.
- Wet-road look without real reflections: low-roughness material, a baked or cube environment map, plus emissive light-streak decals. Real-time reflections are too expensive on mobile.
- Budget: 150 draw calls, 1.5M triangles on screen, dynamic resolution if frame time exceeds 14 ms.

### Cars (the $20/month asset budget)
- AI-generated meshes are usually one merged mesh with no separable wheels. So: generate **body-only** cars (prompt for "no wheels") and use one shared procedural wheel set that spins and steers.
- Paint, underglow, decals and wheels are applied in code, so one mesh gives many looks. That is where the customisation fun comes from cheaply.
- Plan: 6 cars over 2 months, 3 body styles, tier-gated by price.
- Every model passes through `assetLoader` normalisation (scale, origin, facing).

### Audio (procedural)
- Engine: layered saw/square oscillators and filtered noise, pitch from RPM, load from throttle.
- Turbo whistle and blow-off on lift, tyre squeal from slip, nitro whoosh, wind from speed, collisions.
- Music: a small generative synthwave engine (bass, arps, drums, a few chord loops) that intensifies with speed. Optional: 2-3 licensed or royalty-free tracks later if it falls short.

### AI
- Pure pursuit on the racing line, speed from curvature, a little noise from a seeded RNG.
- Rubber-banding that is bounded and mostly invisible. Aggression and mistakes scale with `skill`.
- Goal: races are close and the player feels fast and skilled, not that the AI cheats.

### Mobile
- Controls: auto-throttle, thumb steer, tap handbrake and nitro. Tilt steering as an option.
- Capacitor: safe areas, haptics on collisions and nitro, pause on background.
- Perf tiers (Low/Med/High): pixel ratio, bloom on/off, shadow size, instance counts.

## 5. Working with Qwen

- Qwen takes isolated modules with a signature and spec already written (see `docs/handoff.md`). Claude never leaves it a vague task.
- Each Qwen module passes a review by Claude before it counts as done: build green, no edits outside its files, performance sanity.
- Contract changes go through Claude only.
- Anything feel-critical (handling, cameras, juice) stays with Claude.

## 6. Verification, honestly

- **Automated:** headless tests for physics (gear shifts, drift angles stay bounded, no NaN, lap timing), AI (stays on track for N laps), and camera. Build includes the 220-line rule.
- **Visual:** headless Chromium screenshots with software WebGL to check scenes, bloom, layout.
- **Feel cannot be automated.** I cannot play the game. The loop that works: you play, say "rear feels too loose at 150" or "camera swings too late", and I adjust the tuning values. The tuning panel makes this fast. Weekly playtest notes go in `docs/playtest.md`.

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| Handling feels floaty or twitchy | Phase 1 is exclusively this, with live tuning and a tester before anything else |
| iOS WebGL performance (bloom, MSAA) | Perf tiers from day one, test on a real phone every phase |
| AI-generated car meshes look bad or are huge | Body-only generation, polygon limits in `assetLoader`, curated shortlist before spending credits |
| Scope creep | Phases have exit tests; nothing from a later phase starts early |
| Qwen output breaks architecture | Locked directories, review gate, contract-only coupling |
| Rights issues (cars, music, names) | Original names and designs, procedural or cleared audio |

## 8. Decisions (owner, 2026-11-14)

1. **Weather:** rain AND snow, with real gameplay effect (grip, braking distance, visibility). Contract change: `Weather = 'CLEAR' | 'RAIN' | 'SNOW'` plus a `WeatherProfile` (grip multiplier, fog, particles). Starting grip: clear 1.0, rain 0.72, snow 0.45, tuned live.
2. **Scope:** one city loop first, then short tracks.
3. **Platforms:** release everywhere eventually. Web first (runs on every platform's browser, installable as a PWA), then iOS and Android through Capacitor after demo feedback.
4. **Release:** a free demo (Chapter 1) to build an audience first.
5. **Assets (Claude's call):** minimise credits. 3 body-only cars from one service (Tripo; test one on the free tier before subscribing), everything else procedural (wheels, buildings, rain, snow, underglow, decals). A code-built low-poly fallback car means the game never blocks on assets.
6. **Name:** Racer's Blood. Real car brands are used. Brand names and logos live in one data file (`src/data/cars.ts`) so they can be swapped for fictional ones if the demo is shared publicly.

7. **Car models (2026-11-14, supersedes 5):** FREE Tripo3D tier only (about 13 generations, web UI). Carlos generates the GLBs and drops them in `public/models/{civic,350z,supra,evo,rx7}.glb`; the loader normalises them and falls back to the procedural car when a file is missing. Brief: `docs/assets/tripo-brief.md`.
8. **Feedback round 1:** five cars, a narrow street circuit (Kestrel Bay Streets), AI rivals, Chapter 1 story mode, UI margin fixes.

9. **Round 2 (2026-11-14):** graphics pass on top of Tripo models, obvious particles, aggressive weather physics (setting), turbo and procedural audio, lore and radio. Props via Meshy free tier, optional.

Story and cinematic script: `docs/story.md`.

## 9. Weekend schedule (Sat 14 Nov to Sun 15 Nov)

Goal: a playable, shareable Chapter 1 demo. "Very good on every platform" is the long road after; the weekend produces the version that earns feedback.

| When | Work |
|------|------|
| Sat afternoon | Phase 1: `carController` (drift, gears, nitro), `chaseCam`, keyboard input, tuning panel. Qwen in parallel: `assetLoader`, `aiRacers`, `touchControls` |
| Sat evening | Phase 2: spline circuit, barriers, checkpoints, laps, instanced city, wet road, rain and snow layers + grip effect |
| Sun morning | Phase 3: collisions, 3 AI racers, race flow, podium, 3 cars in (generated or fallback) |
| Sun afternoon | Phase 4: audio (engine, tyres, music), tyre smoke, nitro FX, speed streaks, cinematic with story text |
| Sun evening | Menu, garage-lite (buy and paint), save, deploy to a static host, test on a phone |

Cut first if time runs out: Drift Night event, vinyls, third car, music variety. Never cut: handling feel.
