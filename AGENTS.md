# Rules for Qwen (Hermes): Racer's Blood

Only work when `docs/handoff.md` says `Baton: qwen`; otherwise stop and tell the owner. Do ONE task from `docs/tasks/` at a time. Edit only the files on its `Files:` line. Work on branch `qwen/<task>`, never `main`.

## Rules (the build enforces the first three)
- Every `.ts` file under 220 lines.
- No `enum`, `namespace` or constructor parameter properties; declare fields explicitly.
- Type-only imports use `import type`.
- Import only from `three`, `three/addons/*` and `../types/game`. No new packages.
- Do not edit `src/types/*`, `src/core/*`, `src/camera/*`, `src/physics/carController.ts`, `src/main.ts`.
- No allocation in per-frame code: reuse vectors, no `new Vector3()` inside update loops.
- Car space: +Z nose, +X left. `steer > 0` is LEFT.

## Done
`npm run build` passes with zero errors, plus the task's `Check:` command if it has one. Run them yourself after editing; keep fixing until green, then stop. Do not run git: `scripts/qwen.sh` commits, and reverts any file outside the task's `Files:` line.

## 3D model tasks (Blender, headless)
Models are Python scripts, never hand-edited GLBs: `blender/cars/<id>.py` or `blender/props/<name>.py`, built with `scripts/model-build.sh cars/<id>` (writes `public/models/<id>.glb`, then `scripts/model-check.mts` checks it against `src/data/cars.ts`). The game picks the GLB up automatically.
- Start from `blender/cars/civic.py` (the reference) and the helpers in `blender/lib/rb.py`: `loft`, `paint_faces`, `cut_arches`, `lamp`, `surface_z`, `surface_x`, `box`, `wheel`, `mirror_x`, `smooth`, `finish`, `render`. Follow the recipe at the top of civic.py; details always sit ON the body (lamp/surface_*), never at a guessed z. Read rb.py's docstring first. Do not edit rb.py unless the task lists it.
- Game space in every number you write: +X LEFT, +Y up, +Z NOSE, metres, car on y = 0, centred on x = 0, z = 0.
- Length, width, height, wheelbase and wheel radius come from the car's `shape` in `src/data/cars.ts`; copy them exactly.
- Body in ONE material named `paint` (the garage tints it). Wheels: `rb.wheel('fl'|'fr'|'rl'|'rr', ...)` only.
- Max 30 000 triangles per car, 3 000 per prop. No textures, no images, no downloads, no logos or text on the car.
- `SHOTS=1 scripts/model-build.sh cars/<id>` renders `logs/models/<id>-{front,side,rear}.png` for Claude's review; you cannot judge looks, so get the numbers right and keep shapes simple.

## Blocked or need a contract change?
Don't improvise. Write the question to `docs/inbox/qwen-<task>.md` and stop.
