#!/usr/bin/env bash
# Installs our housekeeping on the game server (idempotent; CHANGES THE SERVER: run only with the owner's OK).
# Copies server/backup/*.sh to /usr/local/sbin, the backup service + timer to /etc/systemd/system, the logrotate
# rule to /etc/logrotate.d, enables the timer, runs one backup and the restore test, dry-runs logrotate.
# Does not touch nginx, the firewall or any player data. Needs `tsh login`.
set -euo pipefail
HOST=${HOST:-notcarlos.mosidealus.nl}
tsh status >/dev/null 2>&1 || { echo "Not logged in to Teleport: run tsh login first"; exit 1; }
TGZ=$(mktemp --suffix=.tgz)
tar czf "$TGZ" -C server backup systemd logrotate
tsh scp -q "$TGZ" "root@$HOST:/tmp/ns-housekeeping.tgz"
rm -f "$TGZ"
tsh ssh "root@$HOST" 'set -e; d=$(mktemp -d); tar xzf /tmp/ns-housekeeping.tgz -C "$d"; rm /tmp/ns-housekeeping.tgz
install -m 0750 "$d/backup/neonspeed-backup.sh" /usr/local/sbin/neonspeed-backup
install -m 0750 "$d/backup/neonspeed-restore-test.sh" /usr/local/sbin/neonspeed-restore-test
install -m 0644 "$d/systemd/neonspeed-backup.service" "$d/systemd/neonspeed-backup.timer" /etc/systemd/system/
install -m 0644 "$d/logrotate/neonspeed-mysql" /etc/logrotate.d/neonspeed-mysql
rm -rf "$d"
systemctl daemon-reload
systemctl enable --now neonspeed-backup.timer
systemctl start neonspeed-backup.service
journalctl -u neonspeed-backup.service -n 3 --no-pager -o cat
/usr/local/sbin/neonspeed-restore-test
logrotate -d /etc/logrotate.d/neonspeed-mysql 2>&1 | grep -iE "error|rotating pattern" || true
systemctl list-timers neonspeed-backup.timer --no-pager | head -2'
