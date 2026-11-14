# Racer's Blood

3D arcade street racer: TypeScript, Three.js, Vite. Web first, Capacitor (iOS/Android) later. You are the lead architect. A local Qwen model (via Aider) builds small isolated modules from `docs/tasks/`; you review them.

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
`src/types` contracts, `src/core` engine, math, race/lap logic, `src/camera`, `src/physics`, `src/world`, `src/input`, `src/data`, `src/ui`, `src/audio`, `src/dev` (throwaway).
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
- Qwen branches are `qwen/<task>`. Never merge without `/review-qwen`.
