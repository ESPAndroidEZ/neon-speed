# Roadmap: server, online play, leaderboards (written 2026-11-20)

Status: PLAN, nothing here is built yet except where marked. Update this file whenever a phase moves. The item-by-item status lives in `docs/master-plan.md` (W1 server, W2 leaderboards, W3 lobby); the prompt to start is `docs/prompts/everything.md`.

## 1. What we have today
- **Online races:** browser to browser (WebRTC) through the free public PeerJS broker. Room = 4-letter code. One player is the host and relays everyone's data (star shape), up to 8 players, the host picks track and weather. No server of ours. Limits: no TURN relay (strict networks and some mobile data cannot connect), a lag spike on the host hurts everyone, each screen works out the finish order itself, no cash or saves online.
- **Server (test server `notcarlos.mosidealus.nl`):** nginx (Ansible-managed, do not edit) serving the game, PHP 8.3-FPM, our own MySQL 8.0 instance (`neonspeed-mysql.service`, 127.0.0.1:3307, ~160 MB) with tables `players`, `player_kv`, `feedback`. APIs: `api/storage.php` (progress, incremental + gzip), `api/feedback.php`.
- **Facts checked on 2026-11-20:** Python 3.12 is installed; Node, Go, Redis and coturn are NOT. 4 CPU cores, about 9.4 GB RAM free. The vhost already proxies `/api/` to `127.0.0.1:8000`, but the proxy has no WebSocket headers (see phase D). Every visitor reaches PHP from the same NAT address (87.233.199.194), so per-IP limits are really global.

## 2. Own lobby vs what we have
| | Peer to peer (today) | Own lobby / relay server |
|---|---|---|
| Cost | none | a process running all the time |
| Delay | lowest | slightly higher (extra hop) |
| Connecting | fails on strict networks | works almost everywhere (server relays) |
| Finding games | share the code | public list of open races |
| Results | each screen decides | server decides: fair, enables leaderboards |
| Host leaves | race can break | server keeps going |
| Dependence | free public broker | fully ours |

## 3. Redis: decision and triggers
Not needed now (server time per request is ~50 ms, the network dominates, MySQL on localhost serves the reads). Revisit when one of these is true:
1. Global leaderboards reach thousands of players (Redis sorted sets).
2. We run our own lobby / relay and want pub/sub between processes.
3. Rate limits must be per real client (needs the real IP from nginx, see phase B).
Before Redis, try PHP APCu (an in-process cache, no extra service).

## 4. Phases (do in this order; each phase ends with tests + docs + checkpoint)
**A. Housekeeping (small, do first)**
- A1. Automatic daily MySQL backup (`mysqldump | gzip`, keep 14 days, in `/var/backups/neonspeed`), plus a documented restore test.
- A2. Ask the server's owner to remove the stale firewall rules for 3306, 4567, 4568, 4444 (old Galera cluster).
- A3. Deploy the current version (`scripts/deploy-server.sh`) and set the feedback recipient (`scripts/set-feedback-email.sh`).
- Done when: a backup file exists and a restore into a scratch database works; site shows the feedback form.

**B. Real client address for rate limits (NO nginx change needed, checked 2026-11-20)**
- nginx passes the real `$remote_addr` to PHP over FastCGI; the single address seen so far was the office network 87.233.x.x, which all testers used. The limits are already per client address. Remaining: one test from a phone on mobile data.
- Done when: two different phones get different `ip_hash` values in the `feedback` table.

**C. Leaderboards (MySQL first, no Redis)**
- Table `scores(track, weather, car, player_id, time_ms, created, ghost_id)` with indexes on (track, weather, car, time_ms); `api/scores.php` (POST a result, GET top 10 + my rank); show it on the results screen and track select.
- Trust: store the ghost (position samples) with each score and validate on the server (sane speed, lap length, start/finish crossing) before accepting; flag outliers. A cheat-proof version needs the server to re-simulate, which is a later step.
- Done when: a result from two different devices appears in the top list, a faked time is rejected, tests cover validation.

**D. Own lobby / relay server (only when triggered: connection failures, strangers, or leaderboards need server-decided results)**
- Port: 127.0.0.1:8770 behind `/ws/` (8000 is the administrator's infra-metrics; request text in `docs/admin-request.md`). Housekeeping and backups: `server/README.md`.
- Technology: a small WebSocket service. Python 3.12 is already there (`asyncio` + `websockets` in a venv, run by systemd as its own user, listening on 127.0.0.1:8000, memory limited). Node would need installing.
- Needs an nginx change, so ask the Ansible owner: in the `/api/` location (or a new `/ws/` location) add `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_read_timeout 3600s;`. Otherwise WebSocket connections are refused.
- Server holds: rooms (code, host, track, weather, players), a public room list, message relay with a rate limit, race start synchronisation, and the finish list built from the server's own receipt times plus each client's claimed time (validated like phase C).
- Client: a second transport next to PeerJS (`net/` already has a link abstraction); keep PeerJS as the fallback so friends can still play if the server is down.
- TURN: optional `coturn` for the remaining WebRTC cases; needs a package install and open UDP ports 3478 and a relay range: ask first.
- Done when: two phones on different mobile networks can race through the server, a room list shows open races, killing the host does not end the race, and `tests/` has a protocol test with a fake server.

**E. Redis (only on the triggers in section 3)**
- Install `redis-server` bound to 127.0.0.1 with a password and a memory limit; use sorted sets for leaderboards and pub/sub between lobby processes; MySQL stays the source of truth, Redis is a cache that can be rebuilt.

## 5. Risks and things that need approval
- Installing packages (Node, Redis, coturn), opening ports, changing nginx or the firewall: all need the server owner's OK. Never edit the Ansible-managed nginx file by hand.
- Player data has no accounts: the player code is the only key. Leaderboards need a display name; moderate names (length, simple word filter) and store nothing personal.
- Real-time features on a single test server have no failover. Keep PeerJS as the fallback.
- Cheating: phase C validation is plausibility only. Say so in the UI ("unverified" vs "verified") if we ever add prizes.
