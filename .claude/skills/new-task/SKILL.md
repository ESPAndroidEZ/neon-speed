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

Then add the task to the Qwen queue in `docs/handoff.md` and tell the owner: `git worktree add ../racer-qwen -b qwen/NNN-short-name` (first time), then `scripts/qwen.sh NNN` from that folder.
