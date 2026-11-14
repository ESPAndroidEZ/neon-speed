
#!/usr/bin/env bash
# (Re)starts the local llama.cpp server for Qwen, bound to 127.0.0.1:8080 only.
# Usage: scripts/start-qwen.sh                 (32k context)
#        MODEL=/path/to/other.gguf scripts/start-qwen.sh
set -euo pipefail
CTX="${CTX:-32768}"
MODEL="${MODEL:-$HOME/models/qwen3.8-27b/Qwen3.8-27B-UD-IQ4_XS.gguf}"
[ -f "$MODEL" ] || { echo "Model file not found: $MODEL"; exit 1; }
DIR="$(dirname "$MODEL")"
FILE="$(basename "$MODEL")"
echo "Model: $MODEL  (context $CTX)"

docker rm -f qwen-server >/dev/null 2>&1 || true
docker run -d --name qwen-server --restart unless-stopped --gpus all \
  -p 127.0.0.1:8080:8080 \
  -v "$DIR:/models:ro" \
  ghcr.io/ggml-org/llama.cpp:server-cuda \
  -m "/models/$FILE" \
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
