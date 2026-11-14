#!/usr/bin/env bash
# One-shot Qwen run for a task file.  Usage: scripts/qwen.sh 001
# Run it from the Qwen worktree (git worktree add ../racer-qwen -b qwen/001-asset-loader).
set -euo pipefail
cd "$(dirname "$0")/.."
export OPENAI_API_BASE="${OPENAI_API_BASE:-http://127.0.0.1:8080/v1}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-local-dummy-key}"

task=$(ls docs/tasks/"$1"-*.md 2>/dev/null | head -1)
[ -n "$task" ] || { echo "No task file docs/tasks/$1-*.md"; exit 1; }
files=$(sed -n 's/^Files: //p' "$task")
[ -n "$files" ] || { echo "$task has no 'Files:' line"; exit 1; }
for f in $files; do mkdir -p "$(dirname "$f")"; [ -e "$f" ] || : > "$f"; done

# shellcheck disable=SC2086
exec aider --read "$task" \
  --message "Implement the task in $task exactly. Edit only: $files. Stop when npm run build passes." \
  $files
