#!/usr/bin/env bash
# One-shot Qwen run for a task file, through Hermes Agent (local llama.cpp server, see start-qwen.sh).
# Usage: scripts/qwen.sh 046        Run it from the Qwen worktree (scripts/qwen-queue.sh sets that up).
# Only one agent works at a time: refuses unless docs/handoff.md says "Baton: qwen" (override: FORCE=1).
# Task file lines used here:  Files: <paths Qwen may change, space separated; a trailing / allows a folder>
#                             Check: <extra command that must pass after the build, e.g. scripts/model-build.sh cars/350z>
# Hermes has no per-file lock, so after the run anything outside Files: is reverted.
set -euo pipefail
cd "$(dirname "$0")/.."
n="$1"; TURNS="${TURNS:-80}"; BUDGET="${BUDGET:-2700}"

grep -q '^Baton: qwen' docs/handoff.md || [ "${FORCE:-}" = 1 ] || {
  echo "The baton is not with Qwen (docs/handoff.md). Let Claude finish and run /checkpoint, or use FORCE=1."; exit 1; }
command -v hermes >/dev/null || { echo "hermes not found"; exit 1; }
curl -fs http://127.0.0.1:8080/health >/dev/null || { echo "Qwen server is down: run scripts/start-qwen.sh"; exit 1; }

task=$(ls docs/tasks/"$1"-*.md 2>/dev/null | head -1)
[ -n "$task" ] || { echo "No task file docs/tasks/$1-*.md"; exit 1; }
files=$(sed -n 's/^Files: //p' "$task")
[ -n "$files" ] || { echo "$task has no 'Files:' line"; exit 1; }
check=$(sed -n 's/^Check: //p' "$task")
start=$(git rev-parse HEAD)

prompt=$(mktemp)
cat > "$prompt" <<EOF
You are Qwen working on Racer's Blood. Follow AGENTS.md exactly. Your task file is $task: read it first, then do it.
You may create or edit ONLY these paths: $files
Anything else you change is reverted automatically. Do not run git commands; the runner commits for you.
When you think you are done run: npm run build${check:+ && $check}
Keep fixing until every command passes, then stop and reply with one short summary line.
If you are blocked, write the question to docs/inbox/qwen-$1.md and stop.
EOF

hermes chat --query-file "$prompt" -Q --in "$PWD" --max-turns "$TURNS" --run-budget "$BUDGET" --yolo || true
rm -f "$prompt"

# Scope guard: revert every change outside Files: (and docs/inbox/qwen-<n>.md).
allowed() {
  local p="$1"
  [ "$p" = "docs/inbox/qwen-$n.md" ] && return 0
  for f in $files; do
    case "$f" in */) [[ "$p" == "$f"* ]] && return 0 ;; *) [ "$p" = "$f" ] && return 0 ;; esac
  done
  return 1
}
changed=$( { git diff --name-only "$start"; git ls-files --others --exclude-standard; } | sort -u)
for p in $changed; do
  allowed "$p" && continue
  echo "out of scope, reverted: $p"
  if git cat-file -e "$start:$p" 2>/dev/null; then git checkout -q "$start" -- "$p"; else rm -f "$p"; fi
done

ok=1
npm run build --silent >/dev/null 2>&1 || ok=0
[ "$ok" = 1 ] && [ -n "$check" ] && { bash -c "$check" || ok=0; }
for p in $files "docs/inbox/qwen-$n.md"; do if [ -e "$p" ]; then git add -A -- "$p"; fi; done
git commit -q -m "qwen: task $1 ($(basename "$task" .md))" || true

if [ "$ok" = 1 ]; then
  sed -i 's/^Baton: .*/Baton: claude/' docs/handoff.md
  git add docs/handoff.md && git commit -q -m "baton: back to Claude after task $1" || true
  echo "Build${check:+ and check} green. Baton returned to Claude: now run /review-qwen $1 in Claude Code."
else
  echo "Build or check NOT green. Baton stays with Qwen: run scripts/qwen.sh $1 again, or fix by hand."
  exit 1
fi
