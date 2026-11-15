#!/usr/bin/env bash
# Run a check that needs the dev server: starts vite on $PORT (default 5199, never the 5173 you use by hand), waits
# until it answers, runs the command, stops vite, returns the command's exit code.
# The command sees the address as $BASE. Examples (quote the command so $BASE is expanded by the inner shell):
#   scripts/with-dev.sh 'node scripts/visual-check.mjs --base $BASE'
#   scripts/with-dev.sh 'node scripts/lang-check.mjs --base $BASE && node scripts/nitro-check.mjs --base $BASE'
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-5199}"
[ -n "${1:-}" ] || { echo "usage: $0 '<command using \$BASE>'"; exit 2; }
node node_modules/vite/bin/vite.js --port "$PORT" --strictPort >/dev/null 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null' EXIT
up=0
for _ in $(seq 1 60); do curl -fs "http://localhost:$PORT/" >/dev/null 2>&1 && { up=1; break; }; sleep 1; done
[ "$up" = 1 ] || { echo "dev server did not start on port $PORT"; exit 1; }
BASE="http://localhost:$PORT/" bash -c "$1"
