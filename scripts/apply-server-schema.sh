#!/usr/bin/env bash
# Applies server/db/schema.sql to the game database (idempotent: only CREATE ... IF NOT EXISTS, nothing is dropped
# or altered). CHANGES THE SERVER: run only with the owner's OK. Takes a backup and runs the restore test first,
# then lists the tables. Needs `tsh login`. Used for the leaderboard tables (lb_names, scores, lb_log).
set -euo pipefail
HOST=${HOST:-notcarlos.mosidealus.nl}
cd "$(dirname "$0")/.."
tsh status >/dev/null 2>&1 || { echo "Not logged in to Teleport: run tsh login first"; exit 1; }
grep -qiE '^\s*(DROP|ALTER|TRUNCATE|DELETE|UPDATE)\b' server/db/schema.sql && { echo "schema.sql has a destructive statement: refusing"; exit 1; }
tsh scp -q server/db/schema.sql "root@$HOST:/tmp/ns-schema.sql"
tsh ssh "root@$HOST" 'set -e; CNF=/etc/neonspeed-mysql/root.cnf
/usr/local/sbin/neonspeed-backup
/usr/local/sbin/neonspeed-restore-test | tail -n 1
mysql --defaults-file=$CNF < /tmp/ns-schema.sql; rm /tmp/ns-schema.sql
mysql --defaults-file=$CNF -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema=\"neonspeed\" ORDER BY 1" | tr "\n" " "; echo'
