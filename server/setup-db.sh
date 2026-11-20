#!/usr/bin/env bash
# Runs ON THE SERVER as root (scripts/setup-server-db.sh copies this folder to /tmp/ns-setup and runs it). Idempotent.
# Creates a separate MySQL 8.0 instance for the game (localhost:3307), the schema, a limited user and /etc/neonspeed/db.php,
# and disables the old Percona XtraDB Cluster unit (mysql.service, dead since August; its data in /var/lib/mysql is NOT touched).
set -euo pipefail
SRC=${1:-/tmp/ns-setup}
DATA=/var/lib/neonspeed-mysql
CONF=/etc/neonspeed-mysql
SOCK=/run/neonspeed-mysql/mysqld.sock

systemctl disable mysql.service 2>&1 | tail -1 || true
systemctl stop mysql.service 2>/dev/null || true

install -d -m 0755 -o root -g root "$CONF" # mysqld (user mysql) must read my.cnf; root.cnf inside is 0600
PHPGRP=$(awk -F= '/^group *=/{gsub(/ /,"",$2);print $2}' /etc/php/8.3/fpm/pool.d/www.conf) # the FPM workers' group (webdev here), NOT www-data
PHPGRP=${PHPGRP:-www-data}
install -d -m 0750 -o root -g "$PHPGRP" /etc/neonspeed
install -m 0644 "$SRC/db/my.cnf" "$CONF/my.cnf"
install -m 0644 "$SRC/db/neonspeed-mysql.service" /etc/systemd/system/neonspeed-mysql.service
# the Percona AppArmor profile only allows /var/lib/mysql: allow the new directories through its local override
LOCAL=/etc/apparmor.d/local/usr.sbin.mysqld
if ! grep -q 'neonspeed-mysql' "$LOCAL" 2>/dev/null; then
  cat >> "$LOCAL" <<'AA'
# neonspeed-mysql (Neon Speed game database)
/var/lib/neonspeed-mysql/ r,
/var/lib/neonspeed-mysql/** rwk,
/run/neonspeed-mysql/ rw,
/run/neonspeed-mysql/** rwk,
/etc/neonspeed-mysql/ r,
/etc/neonspeed-mysql/* r,
AA
fi
apparmor_parser -r /etc/apparmor.d/usr.sbin.mysqld

if [ ! -d "$DATA/mysql" ]; then
  install -d -m 0750 -o mysql -g mysql "$DATA"
  /usr/sbin/mysqld --defaults-file="$CONF/my.cnf" --initialize-insecure --user=mysql
fi
systemctl daemon-reload
systemctl reset-failed neonspeed-mysql.service 2>/dev/null || true
systemctl enable --now neonspeed-mysql.service
for i in $(seq 1 60); do [ -S "$SOCK" ] && break; sleep 1; done

if [ ! -f "$CONF/root.cnf" ]; then
  ROOTPW=$(openssl rand -hex 16)
  mysql --defaults-file=/dev/null -S "$SOCK" -uroot -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$ROOTPW'"
  printf '[client]\nuser=root\npassword=%s\nsocket=%s\n' "$ROOTPW" "$SOCK" > "$CONF/root.cnf"
  chmod 600 "$CONF/root.cnf"
fi
MY="mysql --defaults-file=$CONF/root.cnf" # only this file: /etc/mysql/conf.d sets another socket for the client
$MY < "$SRC/db/schema.sql"
if [ ! -f /etc/neonspeed/db.php ]; then
  APPPW=$(openssl rand -hex 16)
  $MY -e "CREATE USER IF NOT EXISTS 'neonspeed'@'127.0.0.1' IDENTIFIED BY '$APPPW'; CREATE USER IF NOT EXISTS 'neonspeed'@'localhost' IDENTIFIED BY '$APPPW'; ALTER USER 'neonspeed'@'127.0.0.1' IDENTIFIED BY '$APPPW'; ALTER USER 'neonspeed'@'localhost' IDENTIFIED BY '$APPPW'; GRANT SELECT, INSERT, UPDATE, DELETE ON neonspeed.* TO 'neonspeed'@'127.0.0.1'; GRANT SELECT, INSERT, UPDATE, DELETE ON neonspeed.* TO 'neonspeed'@'localhost';"
  printf "<?php\nreturn ['dsn' => 'mysql:host=127.0.0.1;port=3307;dbname=neonspeed;charset=utf8mb4', 'user' => 'neonspeed', 'pass' => '%s'];\n" "$APPPW" > /etc/neonspeed/db.php
fi
chown root:"$PHPGRP" /etc/neonspeed/db.php
chmod 640 /etc/neonspeed/db.php
echo "--- status"
systemctl is-enabled mysql.service neonspeed-mysql.service || true
systemctl is-active mysql.service neonspeed-mysql.service || true
$MY -e "SELECT VERSION() v, @@port p, @@bind_address b, @@innodb_buffer_pool_size/1048576 bp_mb; SHOW TABLES FROM neonspeed;"
ps -o rss= -C mysqld | awk '{printf "mysqld RSS %d MB\n", $1/1024}'
