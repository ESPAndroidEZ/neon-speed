# Master plan (living file)

The single list of big jobs. The prompt `docs/prompts/everything.md` points here: a new session reads this file and continues with the first item that is not DONE. Update the status of every item at every checkpoint (the checkpoint skill does it). Last updated: 2026-11-20 (W4 DONE).

Status values: TODO, DOING, BLOCKED (waiting for the owner or the server administrator), DONE (verified, with the evidence in the changelog).

## Order of work and why
1. W4 Music first: small, visible to every player, no approvals.
2. W1 Server settings: backups and housekeeping protect player data before more features store data.
3. W2 Leaderboards: uses the database we already have.
4. W3 Online customer lobby: needs the administrator's nginx change, so start the design and code while waiting.
5. W5 Open world city driving: the biggest job; do it in blocks with a checkpoint after each (`docs/open-world.md` has the full design).
After each workstream: `/checkpoint`. If the context window is over about 60 %, stop, run `/checkpoint`, and tell the owner to start a fresh session with the same prompt.

## W4. Music that changes by itself
Before (2026-11-20): deep-house songs rotated every 48 bars in a FIXED order with a hard cut; Synthwave never rotated. DONE 2026-11-20: `audio/musicDirector.ts` (shuffle bag `audio/playlist.ts`, two house decks + the synthwave deck, filter sweep + crossfade), style Auto by default, Now playing line, 9 house songs.
| # | Item | Status | Done when |
|---|---|---|---|
| W4.1 | Find out why the owner thinks it is manual (play 5 minutes in menu and in a race; check rotation also after pause/resume, tab hidden, language switch) and fix any real fault | DONE (rotation did work, but in fixed order with hard cuts and no synthwave; real fault fixed: a stalled frame fired every late step at once; synthwave was ~10 dB quieter, level-matched); evidence: `tests/music-auto-check.mts`: 8 songs in 12 unattended minutes, pause, 2 s stall, skip, styles | a lab test plays 6 songs unattended with the mock audio context and every one starts |
| W4.2 | Shuffle bag: every song plays once before any repeats, never the same song twice in a row; keep the manual button as an extra | DONE; evidence: `tests/playlist-check.mts` | unit test over 50 rotations |
| W4.3 | Smooth transition: end each song with a short outro / filter sweep and crossfade into the next intro (no hard cut) | DONE (2-bar drumless outro, 4-bar filter sweep, next song's intro overlaps the last 2 bars); evidence: `tests/lab/music-join.mjs` ALL PASS (3 joins incl. synthwave both ways, levels within 0.5 dB) | offline render shows no click at the join (`tests/lab/house-wav.mjs`) |
| W4.4 | Make it automatic for every style: "Auto" playlist mixes the house songs and the synthwave track; Settings > Music style gets Auto (default) / Deep house / Synthwave | DONE (old saves that stored "house" keep Deep house, which also changes by itself now); evidence: `tests/save-check.mts`, i18n-check, screenshot ES | setting saved and applied, English and Spanish |
| W4.5 | Optional tiny "Now playing: <song>" line when a song changes (off in Advanced if annoying) | DONE (Settings > Advanced > Sound toggle, on by default; called once per song via `MUSIC_SOURCE.onSong`); evidence: checked in a live page | no audio or frame cost |
| W4.6 | Add 3-5 more generative songs (variety: tempo 110-128, different chord sets) | DONE (Glass Tower 112, Afterglow 126, Velvet Underpass 116, Last Exit 128; levels within 0.4 dB of the old songs, `tests/lab/house-wav.mjs`) | `tests/house-check.mts` passes for each |

## W1. Server settings and housekeeping (test server, owner approves anything that changes it)
| # | Item | Status | Done when |
|---|---|---|---|
| W1.1 | Deploy the current version (`scripts/deploy-server.sh`); owner sets `FEEDBACK_EMAIL` | BLOCKED (owner: tsh login, email) | live site shows feedback form and Chapter 3 |
| W1.2 | Daily MySQL backup (`mysqldump | gzip`, 14 days, `/var/backups/neonspeed`, cron or systemd timer) and a tested restore into a scratch database | TODO | restore test passes and is written in docs/skills.md |
| W1.3 | Health endpoint `api/health.php` (DB reachable, disk, version) and a tiny external check script | TODO | returns 200 JSON, tested with curl |
| W1.4 | Log rotation for `/var/lib/neonspeed-mysql/error.log`; MySQL slow-query log off; memory limits confirmed | TODO | logrotate config in `server/` |
| W1.5 | Ask the administrator (exact text provided by us): remove stale ufw rules 3306, 4567, 4568, 4444; pass the real client IP to PHP; long cache headers for `/assets/*` (hashed files); WebSocket proxy lines for W3 | BLOCKED (administrator) | each confirmed with a curl / ss check |
| W1.6 | Real client IP in `storage.php` and `feedback.php` limits (after W1.5) | TODO | two phones get different `ip_hash` |
| W1.7 | `server/` folder documents every file on the server we created (paths, owners, how to rebuild) | TODO | a fresh server can be rebuilt from `server/` + `scripts/setup-server-db.sh` |

## W2. Leaderboards
| # | Item | Status | Done when |
|---|---|---|---|
| W2.1 | `scores` table + indexes in `server/db/schema.sql`; display name (3-16 chars, simple word filter) stored per player | TODO | schema applied by `setup-server-db.sh` |
| W2.2 | `server/api/scores.php`: submit (with ghost samples) and get top 10 + my rank per track, weather and car class; server-side plausibility checks (speed, lap length, crossing order); rate limited | TODO | curl tests: valid accepted, faked time rejected |
| W2.3 | Client: `core/leaderboard.ts` (queue offline, send when online), results screen shows "rank N of M", track select shows the top 3; English and Spanish; "unverified" label | TODO | screenshots + unit test with a fake server |
| W2.4 | Daily challenge gets its own board | TODO | same board code, key = date |

## W3. Online customer lobby (own server) 
| # | Item | Status | Done when |
|---|---|---|---|
| W3.1 | Protocol document (`docs/online-protocol.md`): rooms, join, ready, start, relay, results, errors; versioned | TODO | reviewed by the owner |
| W3.2 | Python asyncio WebSocket service `server/lobby/` (127.0.0.1:8000, systemd unit, memory limit, rate limits, room list, relay, finish list with server receipt times) | TODO | local tests with a fake client |
| W3.3 | Client transport `net/serverLink.ts` beside PeerJS (PeerJS stays as the fallback); lobby screen with a public room list and quick join | TODO | protocol test with a fake server; screenshots |
| W3.4 | Administrator adds the nginx WebSocket lines; we install and start the service (owner approves) | BLOCKED (administrator + owner) | two phones on different mobile networks race through the server |
| W3.5 | Optional TURN (`coturn`) for strict networks | TODO (needs approval) | connection test from a strict network |

## W5. Open world city driving ("Neon Harbor", design in `docs/open-world.md`)
Done: block 0 (design, contracts) and block 1a (district map, generator, 6 km connected city, tests).
| # | Item | Status | Done when |
|---|---|---|---|
| W5.1 | Block 1b: chunk builder (128 m chunks: road ribbons, buildings, props), time-sliced streamer (<= 3 ms per frame, 5x5 live), collision buckets, Free Drive mode (`game/freeRoam.ts`, state FREEROAM: car pick, spawn, pause menu with fast travel / respawn / photo) | TODO | bot drives 10 minutes with flat memory, within the draw-call budget (LOW <= 250 calls / 600k triangles, HIGH <= 500 / 1.5M) |
| W5.2 | Block 2: look per district (palettes, neon, weather, night) | TODO | `npm run visual` ALL PASS in the city |
| W5.3 | Block 3: traffic, traffic lights, pedestrians | TODO | AI never gets more grip than the player; no frame spikes |
| W5.4 | Block 4: GPS and minimap, full map, speed traps, jumps, drift zones, car meet | TODO | each feature has a test or a bot run |
| W5.5 | Block 5: points of interest, missions, city races, save (`roam` in the versioned save), cash through `claimRace` rules | TODO | save round trip test |
| W5.6 | Block 6: Qwen tasks 063-067 and the queue (props, textures, small isolated modules) | TODO | `/review-qwen` per task |
| W5.7 | Block 7: bench on every district and 3 weathers, screenshot QA, deploy, docs | TODO | `docs/perf.md` numbers, owner guide updated |
Hard limits for the whole workstream: physics stays 2D (X/Z), fixed 1/60 steps, no allocation per frame, files under 220 lines, locked turbo / weather / handbrake, English and Spanish for all text, the game must run on a phone (Auto quality).
