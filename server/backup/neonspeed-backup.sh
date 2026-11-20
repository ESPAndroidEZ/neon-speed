#!/bin/bash
# Daily dump of the game database (our own MySQL instance, 127.0.0.1:3307, DB neonspeed). Installed as
# /usr/local/sbin/neonspeed-backup, run by neonspeed-backup.timer. Keeps KEEP_DAYS days in /var/backups/neonspeed (root only).
# The dump has NO "CREATE DATABASE / USE" lines on purpose, so a restore can only go into the database you name.
# Writes /var/backups/neonspeed-last.txt (time, size, file) that api/health.php reports.
set -euo pipefail
DIR=/var/backups/neonspeed
KEEP_DAYS=${KEEP_DAYS:-14}
CNF=/etc/neonspeed-mysql/root.cnf
umask 077
mkdir -p "$DIR"
f="$DIR/neonspeed-$(date +%Y%m%d-%H%M%S).sql.gz"
tmp="$f.part"
trap 'rm -f "$tmp"' EXIT
mysqldump --defaults-file="$CNF" --single-transaction --quick --routines --triggers --events --no-tablespaces --set-gtid-purged=OFF neonspeed | gzip -6 > "$tmp"
gzip -t "$tmp"
zcat "$tmp" | tail -n 1 | grep -q "Dump completed" || { echo "backup FAILED: dump incomplete" >&2; exit 1; }
mv "$tmp" "$f"
find "$DIR" -maxdepth 1 -name 'neonspeed-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
size=$(stat -c %s "$f")
umask 022
printf '%s %s %s\n' "$(date +%s)" "$size" "$(basename "$f")" > /var/backups/neonspeed-last.txt
echo "backup ok: $f ($size bytes)"
