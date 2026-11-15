#!/usr/bin/env bash
# Builds one model from its Blender script, headless, then validates it.
# Usage: scripts/model-build.sh cars/civic      -> blender/cars/civic.py  -> public/models/civic.glb (+ model-check)
#        scripts/model-build.sh props/bollard   -> blender/props/bollard.py -> public/models/props/bollard.glb
#        SHOTS=1 scripts/model-build.sh cars/civic   also renders logs/models/civic-{front,side,rear}.png (Cycles CPU, ~1 min)
# Never overwrites a GLB that Blender did not make (a Tripo/Meshy download) unless FORCE=1.
set -euo pipefail
cd "$(dirname "$0")/.."
target="${1:?usage: scripts/model-build.sh cars/<id> | props/<name>}"
kind="${target%%/*}"; name="${target#*/}"
script="blender/$kind/$name.py"
[ -f "$script" ] || { echo "No script $script"; exit 1; }
case "$kind" in
  cars) out="public/models/$name.glb" ;;
  props) out="public/models/props/$name.glb" ;;
  *) echo "kind must be cars or props"; exit 1 ;;
esac
command -v blender >/dev/null || { echo "Blender missing: run scripts/setup-blender.sh"; exit 1; }

if [ -f "$out" ] && [ "${FORCE:-}" != 1 ] && ! head -c 4000 "$out" | grep -aq 'Blender'; then
  echo "$out exists and was not made by Blender (a downloaded model?). Not overwriting. FORCE=1 to replace."; exit 1
fi

mkdir -p logs/models "$(dirname "$out")"
shots=""; [ "${SHOTS:-}" = 1 ] && shots="logs/models/$name"
log="logs/models/$name.blender.log"
# -b headless, --factory-startup ignores user prefs; python errors make blender exit 1
if ! blender -b --factory-startup --python-exit-code 1 -P "$script" -- --out "$out" ${shots:+--shots "$shots"} > "$log" 2>&1; then
  echo "BLENDER FAILED. Last lines of $log:"; grep -v '^Fra:\|^ *$' "$log" | tail -25; exit 1
fi
grep -h '^RB_STATS' "$log" | sed 's/^RB_STATS /stats: /'
[ -n "$shots" ] && echo "renders: logs/models/$name-front.png, -side.png, -rear.png"

if [ "$kind" = cars ]; then npx tsx scripts/model-check.mts "$out" "$name"; else echo "prop built: $out"; fi
