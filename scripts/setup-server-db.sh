#!/usr/bin/env bash
# One-time (idempotent) setup of the game database on the own server over Teleport (needs `tsh login`). See server/setup-db.sh.
set -euo pipefail
HOST=${HOST:-notcarlos.mosidealus.nl}
cd "$(dirname "$0")/.."
tsh status >/dev/null 2>&1 || { echo "Not logged in to Teleport: run tsh login first"; exit 1; }
tar czf /tmp/ns-setup.tgz -C server db setup-db.sh
tsh scp -q /tmp/ns-setup.tgz "root@$HOST:/tmp/ns-setup.tgz"
tsh ssh "root@$HOST" "set -e; rm -rf /tmp/ns-setup; mkdir /tmp/ns-setup; tar xzf /tmp/ns-setup.tgz -C /tmp/ns-setup; bash /tmp/ns-setup/setup-db.sh /tmp/ns-setup"
