#!/usr/bin/env bash
# Run ONCE inside ~/projects/racer-blood after extracting the v2 archive over it.
# Fixes the first commit (node_modules was committed), renames master -> main, installs, builds.
set -euo pipefail
cd "$(dirname "$0")/.."

git rev-parse --is-inside-work-tree >/dev/null
if git ls-files --error-unmatch node_modules >/dev/null 2>&1; then
  echo "Removing node_modules from git..."
  git rm -r -q --cached node_modules
fi
git branch -M main

rm -rf node_modules
npm install --no-audit --no-fund
npm run build

git add -A
if [ "$(git rev-list --count HEAD)" = "1" ]; then
  git commit -q --amend -m "chore: project foundation, docs and agent setup"
  git reflog expire --expire=now --all && git gc -q --prune=now
  echo "Rewrote the single initial commit. If you ALREADY pushed it, run: git push --force-with-lease -u origin main"
else
  git commit -q -m "chore: foundation, docs and agent setup"
fi
git ls-files | wc -l | xargs echo "Tracked files:"
