#!/usr/bin/env bash
# Prints the latest player feedback stored on the server (needs `tsh login`). Usage: scripts/read-feedback.sh [count]
set -euo pipefail
HOST=${HOST:-notcarlos.mosidealus.nl}
N=${1:-20}
[[ "$N" =~ ^[0-9]+$ ]] || { echo "count must be a number"; exit 1; }
tsh ssh "root@$HOST" "mysql --defaults-file=/etc/neonspeed-mysql/root.cnf -e \"SELECT id, created, kind, mailed, contact, meta, message FROM neonspeed.feedback ORDER BY id DESC LIMIT $N\\G\""
