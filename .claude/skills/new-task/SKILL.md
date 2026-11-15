---
name: new-task
description: Write a task file for the local Qwen model in docs/tasks/. Use to delegate a well-specified, isolated module (asset code, UI, data, simple policies). Not for feel-critical work.
---

Create `docs/tasks/NNN-short-name.md` (next free number, 40 lines max). Qwen has a small context and no memory, so the file must be self-contained:

```
# Task NNN: <title>
Files: <space-separated paths Qwen may edit>
Branch: qwen/NNN-short-name
Contract (read-only): <types from src/types/game.ts it uses>

## Export exactly
<the TypeScript signatures>

## Behaviour
<short numbered or bulleted rules, concrete numbers, edge cases>

## Done when
npm run build passes, files under 220 lines, only listed files changed.
```

Model tasks (Blender car or prop, see AGENTS.md "3D model tasks"): `Files: blender/cars/<id>.py` and add `Check: scripts/model-build.sh cars/<id>`. In Behaviour give the silhouette as numbers (section z positions with bottom/belt/roof heights and roof width, like `blender/cars/civic.py`), the details to add (lights, grille, wing, scoop, mirrors) with sizes and positions in game space, and the colour. After the run, review with `SHOTS=1 scripts/model-build.sh cars/<id>` and look at `logs/models/<id>-*.png`.

Then add the task to the Qwen queue in `docs/handoff.md` and tell the owner: `git worktree add ../racer-qwen -b qwen/NNN-short-name` (first time), then `scripts/qwen.sh NNN` from that folder (Qwen runs through Hermes; the Qwen server must be up: `./start-qwen.sh`). Several tasks unattended: `scripts/qwen-queue.sh NNN MMM`.
