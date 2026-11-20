#!/bin/bash
# Proves a backup can be restored: loads the newest (or the given) dump into the scratch database
# neonspeed_restoretest on the same instance, compares the row count of every table with the live DB, then drops
# the scratch database. Never writes to the live database. Run it right after a backup (counts must match).
# Usage: neonspeed-restore-test [file.sql.gz]
set -euo pipefail
DIR=/var/backups/neonspeed
CNF=/etc/neonspeed-mysql/root.cnf
SCRATCH=neonspeed_restoretest
f=${1:-$(ls -1t "$DIR"/neonspeed-*.sql.gz | head -n 1)}
q() { mysql --defaults-file="$CNF" -N -e "$1"; }
q "DROP DATABASE IF EXISTS \`$SCRATCH\`; CREATE DATABASE \`$SCRATCH\`"
trap 'q "DROP DATABASE IF EXISTS \`$SCRATCH\`"' EXIT
zcat "$f" | mysql --defaults-file="$CNF" "$SCRATCH"
fail=0
for t in $(q "SELECT table_name FROM information_schema.tables WHERE table_schema='neonspeed' ORDER BY 1"); do
  live=$(q "SELECT COUNT(*) FROM neonspeed.\`$t\`")
  back=$(q "SELECT COUNT(*) FROM \`$SCRATCH\`.\`$t\`" 2>/dev/null || echo missing)
  echo "$t: live $live, restored $back"
  [ "$live" = "$back" ] || fail=1
done
[ "$fail" = 0 ] && echo "restore test PASSED ($f)" || { echo "restore test FAILED ($f)" >&2; exit 1; }
