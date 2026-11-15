# Racer's Blood

3D arcade street racer: TypeScript, Three.js, Vite. Web first, Capacitor (iOS/Android) later. You are the lead architect. A local Qwen model (via Hermes Agent, `scripts/qwen.sh`) builds small isolated modules from `docs/tasks/`; you review them.

## Commands
- `npm run build`: 220-line check, `tsc --noEmit`, `vite build`. Zero errors before anything counts as done.
- `npm run dev`: dev server on :5173, LAN-visible for phone testing.

## Hard rules
- Every `.ts` file under 220 lines (the build enforces it).
- No `enum`, `namespace` or constructor parameter properties. Use `import type` for types.
- Physics is pure TS (no `three` imports in `src/physics`) and advances in fixed 1/60 s steps only.
- No allocation in per-frame or per-step code. Reuse vectors.
- Car space: +Z nose, +X left. `steer > 0` is LEFT. Heading h: forward = (sin h, 0, cos h).
- Contracts live in `src/types/game.ts`. Changing one is an architecture change; log it in handoff.
- Real car brand names and logos only in `src/data/cars.ts` (swappable for fictional ones).

## Map
`src/types` contracts, `src/core` engine, math, race/lap logic, `src/camera`, `src/physics` (cars, assists, AI: aiLine/aiTraffic/aiDifficulty), `src/world` (maps, themes, characters), `src/input`, `src/data` (cars, rivals, story, `tracks/*.ts` maps, characters), `src/game` (orchestration, story, cast, versus gate), `src/fx`, `src/ui` (menus, portraits, versus, track select, garage look, tuning, graphics, theme tokens), `src/audio`, `src/dev` (throwaway).
`docs/handoff.md` status and next steps. `docs/plan.md` phases. `docs/story.md` story and cinematic. `docs/tasks/` Qwen tasks. `docs/inbox/` owner notes.

## Session start
Read `docs/handoff.md` and the newest files in `docs/inbox/`. Open `plan.md` or `story.md` only when the task needs them.

## Token discipline
- Never read `node_modules`, `dist` or lockfiles (denied in settings). Read files by line range, not whole, when you only need a part.
- Edit in place; don't rewrite files. Don't re-read a file you just edited. Show only the tail of build output.
- Hand well-specified boilerplate to Qwen with `/new-task`. Keep feel-critical work (handling, cameras, juice) yourself.
- `/clear` between phases. `/compact` around 60% context.
- After every finished block run `/checkpoint`. Do not wait to be "running out".
- Default model is Sonnet. Switch to Opus only for hard design or tuning problems, then switch back.

## Owner decisions (fixed)
- Name Racer's Blood. Real brands. Free Chapter 1 demo first, one city loop, short tracks later.
- Rain and snow change grip and visibility (clear 1.0, rain 0.72, snow 0.45 to start, tuned live).
- Minimise asset credits: car bodies come from the FREE tier of Tripo3D (web UI, about 13 generations; Carlos generates them and drops GLBs into `public/models/{civic,350z,supra,evo,rx7}.glb`). Everything else procedural. No paid credits. The game must work without the GLBs (procedural fallback car) and pick them up automatically when present. (Decision 2026-11-14, feedback round 1.)
- LOCKED (round 3): the turbo (boost model in `physics/drivetrain`, whistle, blow-off, flutter, shift pops in `audio/turboSound`, `AUDIO` turbo defaults, per-car turbo config) and the approved rain/snow physics are NOT to be changed. Carlos likes them.
- Camera shake is a setting (Off / Low default / Normal) and only comes from impacts and big slides (> 0.5 rad); plain acceleration or wheelspin never shakes the camera (regression test `tests/camera-check.mts`).
- Saving (round 3): every stateful module implements `Serializable` (`snapshot()`/`restore()`, contract in `src/types/game.ts`); a restored race must run identically to an uninterrupted one (`tests/save-roundtrip.mts`). Saves are versioned JSON (`core/gameSave`, `SAVE_VERSION`, `MIGRATIONS` hook), 3 manual slots + autosave; bad or future-version saves are rejected, never crash. Esc pauses (and autosaves); skipping cinematics, dialogue or cards never leaves the race.
- Sound: procedural only. Voicing presets (engine Smooth/Raspy/Aggressive, squeal Soft/Sharp) are chosen in the K panel. No samples until Carlos says yes (then log in `docs/assets/licenses.md`).
- Bad weather must stay readable (round 4): `npm run visual` asserts mean luminance, clipped pixels and local contrast in CLEAR/RAIN/SNOW; keep it passing when touching lights, fog, bloom or particles. Procedural cars are lofted bodies from proportion data in `data/cars.ts`.
- Weather physics is a setting `weatherPhysics`: NORMAL, AGGRESSIVE (default), EXTREME. Rain grip 0.72/0.60/0.50, snow 0.45/0.34/0.26 (braking uses the same). AGGRESSIVE and EXTREME add puddles (55% grip, hydroplaning), snow banks at corners, ice in the tunnel and on the bridge, a looser tail in snow; rain and snow ramp in over ~20 s. Same rules for the AI. (Round 2.)
- Turbo is a drivetrain model (boost with lag, extra torque, events for shift, lift and limiter) with per-car config: Supra twin, Evo single, RX-7 sequential twin, Golf single, E61 twin (diesel, 5200 rpm); Civic, 350Z and M3 are naturally aspirated. Audio is procedural (AudioWorklet engine, oscillator fallback). No audio samples unless Carlos allows tiny CC0 ones (log licences if so).
- Props may come from Meshy's FREE tier as GLBs in `public/models/props/` (procedural fallback otherwise). Cars: Tripo free tier (above). Round 2 lore is canonical in `docs/story.md`.
- Session 5 (fixed): STANDARD assist = the approved handling (assists BEGINNER/PRO deviate from it, never STANDARD). Weight transfer is per-car data (`CarTuning`); balance is guarded by `tests/balance-check` (lap-time bands, each car at least as fast as the cheaper one: Civic, Golf, 350Z, RX-7, E61, M3, Evo, Supra). Maps are data (`src/data/tracks`), validated by `tests/tracks-check`; sprint = one run, `raceSamples` shorter than the loop. AI never gets more grip or power than the player; its only help is the rubber band in `physics/aiDifficulty` (capped at 9 %, shrinking per level, Legend none; Legend unlocks after the story). Chapter 2 and its branching choice (flags `open` / `sponsor`) are canonical in `docs/story.md`.
- Session 6 (fixed): visual identity follows docs/art-direction.md (looks, palettes, quality bars, budgets) and menus follow docs/ui-style.md. Brands on signs, parts and upgrades are FICTIONAL. Performance upgrades never touch the locked turbo model (the turbo part only scales an existing turbo). PR must rise with every upgrade (tests/tuning-check). Mobile install: docs/mobile.md.
- Qwen branches are `qwen/<task>`. Never merge without `/review-qwen`.
- 2026-11-15 (session 8, fixed): APPROVED handling: the handbrake carry and drift hold in `physics/stability` (owner: "I love it"); keep them, tune around them. City corners were widened on purpose (tests encode the new widths). Phone controls: GAS + BRAKE on the right, NITRO + HANDBRAKE on the left over drag steering. Eight cars: Civic, Golf IV GTI, 350Z, RX-7, 535d Touring (E61), M3 (E46), Evo VIII, Supra; four price tiers of two. Free races are competitive: rivals at full skill, in cars of the player's tier, with the player's upgrade levels. No more visual work on the existing car models (new cars only). Tyre smoke stays subtle (small, grey, under the bloom). Repo: private GitHub `ESPAndroidEZ/racer-blood`, push after every block.
- 2026-11-15: Qwen runs through Hermes, not Aider. Qwen may also build 3D models as headless Blender scripts (`blender/`, `scripts/model-build.sh`, checked by `scripts/model-check.mts`); a Tripo GLB, if present, is never overwritten without FORCE=1. Blender: `scripts/setup-blender.sh`.
