#!/usr/bin/env bash
# Browser smoke test: load the game in headless Chrome and fail on any uncaught error or console error.
# Needs the dev server running (npm run dev) and Chrome (WSL: the Windows chrome.exe). Usage: scripts/smoke.sh [url-query]
set -uo pipefail
CH="${CHROME:-/mnt/c/Program Files/Google/Chrome/Application/chrome.exe}"
URL="${URL:-http://localhost:5173/}"
fail=0
for q in "?skip&demo&ai=2&ff=6" "?screen=garage" "?screen=story" "?skip&w=rain&ff=4&showcase" "?skip&ai=2&pause=load" "?skip&demo&track=cliff&ff=6" "?skip&demo&track=maze&ai=2&ff=6" "?skip&demo&track=neon&w=rain&ff=5" "?screen=maps"; do
  out=$(timeout 150 "$CH" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --window-size=640,360 --virtual-time-budget=8000 --autoplay-policy=no-user-gesture-required --enable-logging=stderr --v=0 --screenshot=/dev/null "$URL$q" 2>&1 | grep -E 'CONSOLE.*(Uncaught|rror)' | grep -v 'favicon' || true)
  if [ -n "$out" ]; then echo "SMOKE FAIL $q"; echo "$out"; fail=1; else echo "smoke ok  $q"; fi
done
exit $fail
