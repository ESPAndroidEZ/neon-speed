#!/usr/bin/env bash
# Installs the online lobby (server/lobby, Python standard library only: no packages) as neonspeed-lobby.service on
# 127.0.0.1:8770 (idempotent). CHANGES THE SERVER: run only with the owner's OK. Does not touch nginx or the firewall:
# the /ws/ proxy is the administrator's (docs/admin-request.md item 3). Checks the port is free first, runs the
# lobby's own tests on the server's Python before starting, then does a local WebSocket handshake check. Needs `tsh login`.
set -euo pipefail
HOST=${HOST:-notcarlos.mosidealus.nl}
cd "$(dirname "$0")/.."
tsh status >/dev/null 2>&1 || { echo "Not logged in to Teleport: run tsh login first"; exit 1; }
TGZ=$(mktemp --suffix=.tgz)
tar czf "$TGZ" -C server lobby/lobby.py lobby/rooms.py lobby/wsproto.py lobby/test_lobby.py systemd/neonspeed-lobby.service
tsh scp -q "$TGZ" "root@$HOST:/tmp/ns-lobby.tgz"
rm -f "$TGZ"
tsh ssh "root@$HOST" 'set -e; d=$(mktemp -d); tar xzf /tmp/ns-lobby.tgz -C "$d"; rm /tmp/ns-lobby.tgz
if ss -ltnp | grep -q ":8770 " && ! systemctl is-active -q neonspeed-lobby; then echo "port 8770 is used by something else: stopping"; exit 1; fi
python3 "$d/lobby/test_lobby.py" | tail -n 1
install -d -m 0755 /opt/neonspeed-lobby
install -m 0644 "$d/lobby/lobby.py" "$d/lobby/rooms.py" "$d/lobby/wsproto.py" /opt/neonspeed-lobby/
install -m 0644 "$d/systemd/neonspeed-lobby.service" /etc/systemd/system/
rm -rf "$d"
systemctl daemon-reload
systemctl enable -q neonspeed-lobby
systemctl restart neonspeed-lobby
sleep 1
systemctl is-active neonspeed-lobby
curl -s -o /dev/null -w "local handshake: %{http_code}\n" -m 3 -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" http://127.0.0.1:8770/ws/ || true'
