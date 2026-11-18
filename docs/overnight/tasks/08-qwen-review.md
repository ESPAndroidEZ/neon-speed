# 08 Review finished Qwen branches

Qwen builds on `qwen/<task>` branches (see `.claude/skills/review-qwen`, `docs/tasks/`). Never merge without the review procedure, and here "merge" means into THIS overnight branch only, never `main`.

1. `git branch --list 'qwen/*'` and `grep -E " 0(5[6-9]|6[0-9]) " logs/qwen/summary.txt` (if the file exists). Also `pgrep -f qwen-queue`: if Qwen is running, do NOT touch its branches or its worktree (`../racer-qwen`); write that in the report and finish this task as blocked.
2. For each branch that has real commits (files > 0): follow the review-qwen skill checks (scope, hard rules, 220 lines, build, tests, quality). Qwen branches carry a handoff edit, so copy only the finished files into this branch with `git show qwen/NNN-slug:path > path` instead of `git merge`.
3. Pass: wire per the task file and commit. Fail: write precise fix instructions into the task file under `## Review notes` and leave the branch alone. Empty branches (nothing committed) are only listed in the report.
4. Archive finished task files with `git mv docs/tasks/NNN-*.md docs/tasks/done/`.

Done when: every non-empty Qwen branch is merged-by-copy or has review notes, and the report has one line per branch (merged / needs fixes / empty).
