# Rules for Qwen (Aider): Racer's Blood

Do ONE task from `docs/tasks/` at a time. Edit only the files on its `Files:` line. Work on branch `qwen/<task>`, never `main`.

## Rules (the build enforces the first three)
- Every `.ts` file under 220 lines.
- No `enum`, `namespace` or constructor parameter properties; declare fields explicitly.
- Type-only imports use `import type`.
- Import only from `three`, `three/addons/*` and `../types/game`. No new packages.
- Do not edit `src/types/*`, `src/core/*`, `src/camera/*`, `src/physics/carController.ts`, `src/main.ts`.
- No allocation in per-frame code: reuse vectors, no `new Vector3()` inside update loops.
- Car space: +Z nose, +X left. `steer > 0` is LEFT.

## Done
`npm run build` passes with zero errors. Aider runs it after each edit; keep fixing until it is green, then stop.

## Blocked or need a contract change?
Don't improvise. Write the question to `docs/inbox/qwen-<task>.md` and stop.
