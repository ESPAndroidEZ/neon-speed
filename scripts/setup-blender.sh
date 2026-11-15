#!/usr/bin/env bash
# Installs a portable Blender (LTS, no sudo) into ~/opt/blender and links ~/.local/bin/blender.
# Blender runs headless (-b) for the Qwen model pipeline: scripts/model-build.sh.
# Usage: scripts/setup-blender.sh            (newest 4.5 LTS patch)
#        SERIES=4.5 scripts/setup-blender.sh
set -euo pipefail
SERIES="${SERIES:-4.5}"
DEST="$HOME/opt"
BIN="$HOME/.local/bin"
if command -v blender >/dev/null; then blender -b --version 2>/dev/null | head -1; echo "Blender already installed."; exit 0; fi

base="https://download.blender.org/release/Blender$SERIES/"
file=$(curl -fsSL "$base" | grep -o "blender-$SERIES\.[0-9]*-linux-x64\.tar\.xz" | sort -V | tail -1)
[ -n "$file" ] || { echo "No linux-x64 build found at $base"; exit 1; }
echo "Downloading $file (~350 MB)..."
mkdir -p "$DEST" "$BIN"
curl -fL --progress-bar "$base$file" -o "$DEST/$file"
tar -xf "$DEST/$file" -C "$DEST"
rm -f "$DEST/$file"
rm -rf "$DEST/blender"
mv "$DEST/${file%.tar.xz}" "$DEST/blender"
ln -sf "$DEST/blender/blender" "$BIN/blender"

# Headless Blender on WSL needs a few X/GL libs even with -b (it never opens a window).
missing=$(ldd "$DEST/blender/blender" 2>/dev/null | awk '/not found/ {print $1}' | tr '\n' ' ')
[ -z "$missing" ] || echo "Missing system libs: $missing
Install with: sudo apt install -y libxi6 libxxf86vm1 libxfixes3 libxrender1 libxkbcommon0 libsm6 libgl1 libegl1"
"$BIN/blender" -b --factory-startup --version | head -1
