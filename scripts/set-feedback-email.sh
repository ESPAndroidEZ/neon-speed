#!/usr/bin/env bash
# Sets where in-game feedback emails go (stored only on the server, /etc/neonspeed/feedback.php, never in git).
# Usage:  FEEDBACK_EMAIL=you@example.com scripts/set-feedback-email.sh   (needs `tsh login`)
set -euo pipefail
HOST=${HOST:-notcarlos.mosidealus.nl}
: "${FEEDBACK_EMAIL:?set FEEDBACK_EMAIL=address}"
[[ "$FEEDBACK_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo "not a valid email address"; exit 1; }
printf "<?php\nreturn ['to' => '%s'];\n" "$FEEDBACK_EMAIL" | tsh ssh "root@$HOST" 'cat > /etc/neonspeed/feedback.php && chown root:$(awk -F= "/^group *=/{gsub(/ /,\"\",\$2);print \$2}" /etc/php/8.3/fpm/pool.d/www.conf) /etc/neonspeed/feedback.php && chmod 640 /etc/neonspeed/feedback.php && echo "feedback recipient saved on the server"'
