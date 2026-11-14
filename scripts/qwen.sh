#!/usr/bin/env bash
# One-shot Qwen run for a task file.  Usage: scripts/qwen.sh 001
# Run it from the Qwen worktree (git worktree add ../racer-qwen -b qwen/001-asset-loader).
# Only one agent works at a time: this refuses unless docs/handoff.md says "Baton: qwen" (override: FORCE=1).
set -euo pipefail
cd "$(dirname "$0")/.."
export OPENAI_API_BASE="${OPENAI_API_BASE:-http://127.0.0.1:8080/v1}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-local-dummy-key}"

grep -q '^Baton: qwen' docs/handoff.md || [ "${FORCE:-}" = 1 ] || {
  echo "The baton is not with Qwen (docs/handoff.md). Let Claude finish and run /checkpoint, or use FORCE=1."; exit 1; }

task=$(ls docs/tasks/"$1"-*.md 2>/dev/null | head -1)
[ -n "$task" ] || { echo "No task file docs/tasks/$1-*.md"; exit 1; }
files=$(sed -n 's/^Files: //p' "$task")
[ -n "$files" ] || { echo "$task has no 'Files:' line"; exit 1; }
for f in $files; do mkdir -p "$(dirname "$f")"; [ -e "$f" ] || : > "$f"; done

# shellcheck disable=SC2086
aider --read "$task" \
  --message "Implement the task in $task exactly. Edit only: $files. Stop when npm run build passes." \
  $files || true

if npm run build --silent >/dev/null 2>&1; then
  sed -i 's/^Baton: .*/Baton: claude/' docs/handoff.md
  git add docs/handoff.md && git commit -q -m "baton: back to Claude after task $1" || true
  echo "Build is green. Baton returned to Claude: now run /review-qwen $1 in Claude Code."
else
  echo "Build is NOT green. Baton stays with Qwen: run scripts/qwen.sh $1 again, or fix by hand."
fi
