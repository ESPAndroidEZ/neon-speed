---
name: checkpoint
description: Save progress after finishing any block of work and at the end of every session. Updates ALL documentation (handoff, owner guide, changelog, skills, roadmap, code map), commits and pushes. Use after every completed block, before long tasks, at the end of each session, or when usage is running low.
---

Owner rule (2026-11-20): all documentation is updated after every change, and every session ends with this checkpoint.

1. `npm run build:q` (quiet: full log in logs/last-build.txt), `npm run test:q` (`grep -c "^FAIL" logs/last-test.txt` must be 0) and `npm run map` (refreshes docs/code-map.md). If anything fails, say so in the handoff and the owner guide instead of hiding it.
2. Update the documents (only what the work touched, but check each one):
   - `docs/handoff.md`: move finished items to Done, rewrite Next (3 lines max), update the Qwen queue, list open contract requests, append ONE line to the Log.
   - `docs/owner-guide.md`: sections 1 (what exists), 3 (commands, if any changed), 4 (decisions), 5 (security and housekeeping), 6 (what is NOT verified; remove items that got verified, add new unverified ones), and the "last updated" date. Plain language for the owner.
   - `docs/changelog.md`: add or extend today's dated section (newest first), plain language.
   - `docs/skills.md`: new files, playbooks, server facts, gotchas for the agents.
   - `docs/roadmap-online.md`: move phase statuses; `docs/story.md` / `docs/qa-report.md` when the story or a visual bug changed.
   - `docs/prompts/server-to-code.md`: refresh if the roadmap or the rules changed.
   - Memory notes (`~/.claude/projects/-home-carlosgeorgiev-racer-blood/memory/`) when a fact about the server, the owner or the workflow changed.
   If the owner asked to hand over to Qwen (or usage is nearly out): make sure the next task file exists in `docs/tasks/`, set the line `Baton: qwen` in the handoff, and write the exact command for the owner (`git worktree add ../racer-qwen -b qwen/NNN-name`, `cd ../racer-qwen && npm install && scripts/qwen.sh NNN`).
3. `git add -A && git commit -m "<what changed, one line>"` (never put the owner's email address in a command; the git identity is already configured in this repo). End the message with the Co-Authored-By line from the session instructions.
4. `git push` (current branch). If there is no remote, say so.
5. Reply with at most 3 lines: what is saved and what comes next. Mention what is committed but not deployed.
