---
name: review-qwen
description: Review a Qwen branch (qwen/<task>) before merging. Checks scope, rules, build and code quality, then merges or writes fix instructions. Argument is the task number, e.g. 001.
---

Rule: run `git diff --stat` first and read only the changed ranges (never whole files).

1. Read `docs/tasks/$ARGUMENTS-*.md` (the Files line and Done-when).
2. `git diff main...qwen/<branch> --stat`. Only the listed files may change. Anything else: reject.
3. `git switch qwen/<branch>`, then `npm run build`. Must be green. `wc -l` on each changed file.
4. Read the changed files once. Check: forbidden syntax (`enum`, `constructor(private`), per-frame allocation, wrong steering sign, imports outside the allowed list, missing dispose/cleanup, behaviour against the spec.
5. Pass: `git switch main && git merge --no-ff qwen/<branch>`, `npm run build`, add a Log line to `docs/handoff.md`.
6. Fail: write precise numbered fixes to `docs/inbox/NNN-fix-<task>.md` (next free number), leave the branch unmerged, and tell the owner to re-run `scripts/qwen.sh <task>`.
