---
name: sync-docs
description: Make the docs match the code. Run at the end of every phase or step, before /checkpoint.
---

1. `ls src/*` and `git diff --stat HEAD~1` to see what changed.
2. `docs/handoff.md`: edit in place. Done, Next (3 lines max), Qwen queue, Log (one line).
3. `docs/plan.md`: update the Status column of the phase table (done / in progress / todo) and the "Last updated" date.
4. `CLAUDE.md`: update the "Map" section only if folders were added or renamed.
5. `README.md`: update the command list if scripts changed (`npm run dev`, `build`, `test`).
6. `docs/architecture.md` (max 80 lines): modules, data flow, contracts, tuning knobs. Edit sections that no longer match the code; do not rewrite the whole file.
7. Verify with `grep` that every file path named in the docs still exists. Reply with one line.
