#!/usr/bin/env bash
# Entry point for a fresh console window: sets PATH like an interactive shell, runs the runner, keeps the window open.
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$PATH"
echo "Neon Speed overnight runner. Ctrl+C stops it. Or: touch docs/overnight/STOP"
UNTIL=${UNTIL:-09:00} scripts/overnight.sh
echo; echo "Runner finished. Last lines of the log:"; tail -n 8 logs/overnight/runner.log
exec bash
