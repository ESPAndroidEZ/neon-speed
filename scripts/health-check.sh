#!/usr/bin/env bash
# Tiny external check of the live game server: exits 0 when /api/health.php says ok, 1 otherwise (cron or by hand).
# Warns when the last backup is older than 30 hours. Usage: scripts/health-check.sh [base-url]
set -uo pipefail
BASE=${1:-https://notcarlos.mosidealus.nl}
body=$(curl -s -m 10 -w '\n%{http_code}' "$BASE/api/health.php") || { echo "DOWN: no answer from $BASE"; exit 1; }
code=${body##*$'\n'}; json=${body%$'\n'*}
echo "$code $json"
[ "$code" = 200 ] || { echo "UNHEALTHY"; exit 1; }
age=$(printf '%s' "$json" | sed -n 's/.*"backup_age_h":\([0-9.]*\).*/\1/p')
if [ -z "$age" ]; then echo "WARN: no backup yet"; elif awk "BEGIN{exit !($age > 30)}"; then echo "WARN: last backup $age h old"; fi
echo OK
