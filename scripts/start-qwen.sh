#!/usr/bin/env bash
# (Re)starts the local llama.cpp server for Qwen, bound to 127.0.0.1:8080 only.
# Usage: scripts/start-qwen.sh            (32k context)
#        CTX=65536 scripts/start-qwen.sh  (only if you have the VRAM for it)
set -euo pipefail
CTX="${CTX:-32768}"
HF="$HOME/.cache/huggingface"

# Pick the GGUF on the host. The old command passed a '*' glob straight into the
# container, where nothing expands it, so llama.cpp could not find the model.
GGUF=$(ls -1 "$HF"/hub/models--*/snapshots/*/*.gguf 2>/dev/null | grep -i 'q4_k_m' | grep -iv 'mmproj' | head -1 || true)
[ -n "$GGUF" ] || { echo "No Q4_K_M .gguf found under $HF/hub"; exit 1; }
echo "Model file: $GGUF"

docker rm -f qwen-server >/dev/null 2>&1 || true
docker run -d --name qwen-server --restart unless-stopped --gpus all \
  -p 127.0.0.1:8080:8080 \
  -v "$HF:/root/.cache/huggingface" \
  ghcr.io/ggml-org/llama.cpp:server-cuda \
  -m "/root/.cache/huggingface/${GGUF#"$HF"/}" \
  --alias qwen-27b --host 0.0.0.0 --port 8080 \
  -c "$CTX" -ngl 99 -fa on --cache-type-k q8_0 --cache-type-v q8_0

echo "Waiting for the model to load..."
for _ in $(seq 1 60); do
  if curl -fs http://127.0.0.1:8080/health >/dev/null 2>&1; then echo "Server is up."; exit 0; fi
  sleep 3
done
echo "Not healthy after 3 minutes. Last log lines:"
docker logs --tail 25 qwen-server
exit 1
