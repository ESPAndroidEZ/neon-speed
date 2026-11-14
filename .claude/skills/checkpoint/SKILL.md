---
name: checkpoint
description: Save progress after finishing any block of work. Updates docs/handoff.md, commits and pushes. Use after every completed block, before long tasks, or when usage is running low.
---

1. `npm run build`. If it fails, say so in the handoff instead of hiding it.
2. Edit `docs/handoff.md` in place: move finished items to Done, rewrite Next (3 lines max), update the Qwen queue, list open contract requests, append ONE line to the Log.
3. `git add -A && git commit -m "<what changed, one line>"`.
4. `git push` (current branch). If there is no remote, say so.
5. Reply with at most 3 lines: what is saved and what comes next.
