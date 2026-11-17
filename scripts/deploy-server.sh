#!/usr/bin/env bash
# Deploys the brand-safe public build to the own web server over Teleport (needs `tsh login` first).
# nginx there is managed by Ansible: only the docroot is touched, never the config.
set -euo pipefail
HOST=${HOST:-notcarlos.mosidealus.nl}
ROOT=${ROOT:-/data/www/carlos.mosidealus.nl/public_html}
tsh status >/dev/null 2>&1 || { echo "Not logged in to Teleport: run tsh login first"; exit 1; }
npm run build:public >logs/last-public.txt 2>&1 || { tail -20 logs/last-public.txt; exit 1; }
TGZ=$(mktemp --suffix=.tgz)
tar czf "$TGZ" -C dist .
tsh scp -q "$TGZ" "webdev@$HOST:/tmp/rb-dist.tgz"
rm -f "$TGZ"
# fresh copy: remove the previous release (old hashed assets) and unpack the new one
tsh ssh "webdev@$HOST" "set -e; cd '$ROOT'; find . -mindepth 1 -delete; tar xzf /tmp/rb-dist.tgz; rm /tmp/rb-dist.tgz; curl -s -o /dev/null -w 'index.html: %{http_code}\n' -H 'Host: $HOST' http://127.0.0.1/"
echo "Deployed to http://$HOST/"
