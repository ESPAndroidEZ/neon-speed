# Request to the server administrator (BLOCKED until done)

Status: NOT SENT yet. The owner sends the text below. Facts checked read-only on 2026-11-20.
Server: notcarlos.mosidealus.nl (vhost `/etc/nginx/sites-enabled/carlos.mosidealus.nl.conf`, Ansible-managed).

---

Hi,

For my game on notcarlos.mosidealus.nl I would like three small changes. I know nginx (and probably ufw) is managed by Ansible, so I did not touch them myself.

**1. Firewall cleanup (ufw).** These rules are left over from the old Percona XtraDB (Galera) cluster. That `mysql.service` is disabled and dead since August; my own MySQL only listens on 127.0.0.1:3307. Please remove the rules that open these ports to Anywhere, both IPv4 and IPv6:
- 3306/tcp, 4567 (tcp+udp), 4568/tcp, 4444/tcp
(In `ufw status numbered` today: rules 4-7 and 11-14.) Ports 80/443 and your own allow-lists must stay.

**2. Cache headers for the game's static files.** Files under `/assets/` have a content hash in their name and never change, so they can be cached for a year. `index.html` and `sw.js` must always be checked again. Inside the `server { listen 443 ... }` block:
```
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
}
location = /index.html { add_header Cache-Control "no-cache"; }
location = /sw.js      { add_header Cache-Control "no-cache"; }
```

**3. WebSocket proxy for the multiplayer lobby (a small Python service I will run on 127.0.0.1:8770).** Port 8000 is already used by your infra-metrics service, so I picked 8770. Inside the same server block:
```
location /ws/ {
    proxy_pass http://127.0.0.1:8770;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
}
```
Nothing needs to listen there yet; until the service runs, `/ws/` simply returns 502.

No change is needed for the client IP: PHP already receives the real address through FastCGI.

Thanks!

---

How we verify each item afterwards (read-only):
1. `ufw status numbered` shows no 3306/4444/4567/4568; `curl -m 5 telnet://notcarlos.mosidealus.nl:3306` from outside times out.
2. `curl -sI https://notcarlos.mosidealus.nl/assets/<any file>` shows `Cache-Control: public, max-age=31536000, immutable`; `curl -sI .../` shows `no-cache`.
3. `curl -si -H 'Connection: Upgrade' -H 'Upgrade: websocket' https://notcarlos.mosidealus.nl/ws/` returns 502 (before the service) and 101 once the lobby runs.
