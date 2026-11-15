#!/usr/bin/env bash
# Quiet runner: keeps long build/test output out of the agent's context.
# Usage: scripts/q.sh <name> <command...>   -> full output in logs/last-<name>.txt
# Success: one line "[name] OK (N lines, log: path)" + the last 3 lines.
# Failure: "[name] FAILED exit N", up to 25 matching error lines (grep -n), the last 15 lines; returns the exit code.
set -uo pipefail
name="${1:?usage: scripts/q.sh <name> <command...>}"; shift
cd "$(dirname "$0")/.."
mkdir -p logs
log="logs/last-$name.txt"
"$@" > "$log" 2>&1
rc=$?
lines=$(wc -l < "$log")
if [ "$rc" -eq 0 ]; then
  echo "[$name] OK ($lines lines, log: $log)"
  tail -n 3 "$log"
else
  echo "[$name] FAILED exit $rc ($lines lines, log: $log)"
  grep -n -E 'error|Error|FAIL|failed|assert' "$log" | head -n 25
  echo "--- last 15 lines ---"
  tail -n 15 "$log"
fi
exit "$rc"
