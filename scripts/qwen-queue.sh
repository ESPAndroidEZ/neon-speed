#!/usr/bin/env bash
# Run Qwen tasks back to back, unattended, in an isolated worktree (../racer-qwen). Never touches main.
# Usage: scripts/qwen-queue.sh [--dry-run] 005 003 007 ...
# Per task: reset the worktree to a fresh branch qwen/<task-file-name> from main, npm install if needed,
# run scripts/qwen.sh <n> with AIDER_YES_ALWAYS=1 under `timeout 30m`, log to logs/qwen/<task>.log,
# append one result line to logs/qwen/summary.txt, then continue with the next task even if this one failed.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WT="$ROOT/../racer-qwen"
LOGS="$ROOT/logs/qwen"
DRY=0
TASKS=()
for a in "$@"; do if [ "$a" = "--dry-run" ]; then DRY=1; else TASKS+=("$a"); fi; done
[ ${#TASKS[@]} -gt 0 ] || { echo "usage: $0 [--dry-run] <task numbers...>"; exit 2; }

say() { echo "[$(date +%H:%M:%S)] $*"; }
sum() { if [ "$DRY" = 1 ]; then echo "DRY summary: $*"; else mkdir -p "$LOGS"; echo "$(date -Is) $*" >> "$LOGS/summary.txt"; fi; }
run() { if [ "$DRY" = 1 ]; then echo "DRY: $*"; return 0; fi; "$@"; }
[ "$DRY" = 1 ] || mkdir -p "$LOGS"

command -v aider >/dev/null || [ "$DRY" = 1 ] || { say "aider not found"; exit 1; }
say "queue: ${TASKS[*]} (dry-run=$DRY)"

for n in "${TASKS[@]}"; do
  file=$(ls "$ROOT"/docs/tasks/"$n"-*.md 2>/dev/null | head -1)
  if [ -z "$file" ]; then sum "$n SKIPPED no task file"; say "task $n: no task file, skipping"; continue; fi
  name=$(basename "$file" .md)
  branch="qwen/$name"
  log="$LOGS/$name.log"
  say "task $n ($name) -> branch $branch"

  # 1. worktree on a fresh branch from main (never main itself)
  if [ ! -d "$WT" ]; then
    run git -C "$ROOT" worktree add -B "$branch" "$WT" main || { sum "$n $name FAILED worktree"; continue; }
  else
    run git -C "$WT" checkout -q -B "$branch" main || { sum "$n $name FAILED checkout"; continue; }
    run git -C "$WT" reset -q --hard main
    run git -C "$WT" clean -fdq
  fi
  if [ "$DRY" != 1 ] && [ "$(git -C "$WT" branch --show-current)" = "main" ]; then sum "$n $name ABORTED worktree is on main"; continue; fi

  # 2. dependencies
  if [ "$DRY" = 1 ] || [ ! -d "$WT/node_modules" ]; then run bash -c "cd '$WT' && npm install --no-audit --no-fund >/dev/null 2>&1"; fi

  # 3. run Qwen (the baton line in the worktree comes from main: it must say 'Baton: qwen')
  start=$(date +%s)
  run bash -c "cd '$WT' && AIDER_YES_ALWAYS=1 timeout 30m scripts/qwen.sh '$n' > '$log' 2>&1"
  rc=$?
  mins=$(( ($(date +%s) - start) / 60 ))

  # 4. result line
  if [ "$DRY" = 1 ]; then sum "$n $name exit=$rc (not run)"; continue; fi
  build=fail
  (cd "$WT" && npm run build --silent >/dev/null 2>&1) && build=ok
  commits=$(git -C "$WT" rev-list --count main.."$branch" 2>/dev/null || echo 0)
  changed=$(git -C "$WT" diff --name-only "$(git -C "$WT" merge-base main "$branch")" "$branch" 2>/dev/null | grep -v "^docs/handoff.md$" | wc -l)
  state=DONE; [ "$changed" = 0 ] && state=EMPTY; [ "$rc" = 124 ] && state=TIMEOUT; [ "$rc" != 0 ] && [ "$rc" != 124 ] && state=FAILED
  sum "$n $name $state exit=$rc build=$build commits=$commits files=$changed minutes=$mins log=logs/qwen/$name.log"
done
say "queue finished"
