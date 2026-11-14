---
name: checkpoint
description: Save progress after finishing any block of work. Updates docs/handoff.md, commits and pushes. Use after every completed block, before long tasks, or when usage is running low.
---

1. `npm run build`. If it fails, say so in the handoff instead of hiding it.
2. Edit `docs/handoff.md` in place: move finished items to Done, rewrite Next (3 lines max), update the Qwen queue, list open contract requests, append ONE line to the Log.
   If the owner asked to hand over to Qwen (or usage is nearly out): make sure the next task file exists in `docs/tasks/`, set the line `Baton: qwen` in the handoff, and write the exact command for the owner (`git worktree add ../racer-qwen -b qwen/NNN-name`, `cd ../racer-qwen && npm install && scripts/qwen.sh NNN`).
3. `git add -A && git commit -m "<what changed, one line>"`.
4. `git push` (current branch). If there is no remote, say so.
5. Reply with at most 3 lines: what is saved and what comes next.
