#!/usr/bin/env bash
# Entry point for a fresh console window: starts the runner in the background and shows the live Claude session.
# Ctrl+B then D detaches from the session view (the runner keeps going); this window re-attaches by itself.
# Do NOT press Ctrl+C inside the session view: it interrupts Claude. To stop everything: touch docs/overnight/STOP
# (finishes the current step) or close this window / run `pkill -f scripts/overnight.sh`.
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$PATH"
mkdir -p logs/overnight
ALLOW_DIRTY=${ALLOW_DIRTY:-1} UNTIL=${UNTIL:-} scripts/overnight.sh >>logs/overnight/runner.out 2>&1 &
runner=$!
trap 'kill $runner 2>/dev/null' EXIT HUP
echo "Neon Speed overnight runner (pid $runner). Waiting for the first session..."
while kill -0 "$runner" 2>/dev/null; do
  if tmux has-session -t neon 2>/dev/null; then tmux attach -t neon; sleep 2
  else
    clear; echo "Runner is between sessions (or sleeping until a usage limit resets). Last log lines:"
    tail -n 6 logs/overnight/runner.log; sleep 10
  fi
done
echo; echo "Runner finished. Last lines of the log:"; tail -n 8 logs/overnight/runner.log
exec bash
