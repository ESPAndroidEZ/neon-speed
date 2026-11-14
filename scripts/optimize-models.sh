#!/usr/bin/env bash
# Shrink car GLBs for the web: dedup, prune, textures resized to 1024 and re-encoded as WebP.
# Usage: scripts/optimize-models.sh [dir]   (default: public/models). Originals are kept in assets-src/models/ (git-ignored, never shipped).
# Needs the dev dependency @gltf-transform/cli (npm install already fetched it).
set -euo pipefail
DIR="${1:-public/models}"
SRC="assets-src/models"
mkdir -p "$SRC"
shopt -s nullglob
files=("$DIR"/*.glb)
if [ ${#files[@]} -eq 0 ]; then echo "no .glb files in $DIR"; exit 0; fi
for f in "${files[@]}"; do
  name=$(basename "$f")
  [ -f "$SRC/$name" ] || cp "$f" "$SRC/$name"
  tmp=$(mktemp --suffix=.glb)
  npx gltf-transform dedup "$SRC/$name" "$tmp"
  npx gltf-transform prune "$tmp" "$tmp"
  npx gltf-transform resize "$tmp" "$tmp" --width 1024 --height 1024
  npx gltf-transform webp "$tmp" "$tmp"
  mv "$tmp" "$f"
  echo "$name: $(du -h "$SRC/$name" | cut -f1) -> $(du -h "$f" | cut -f1)"
done
