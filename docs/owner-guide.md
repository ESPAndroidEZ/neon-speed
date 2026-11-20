# Neon Speed: owner's guide

For Carlos. Plain language, no code reading needed. Updated at every checkpoint (last: 2026-11-20, after W2 lap boards, W3 lobby, W5.1 Free Drive and W5.2 district looks). The technical version for Claude and Qwen is `docs/skills.md`; the list of changes by date is `docs/changelog.md`.

## 1. What the game is today
A 3D arcade street racer that runs in the browser (phone and PC), English and Spanish.
- **Cars:** 8 real-brand cars (Civic, Golf IV GTI, 350Z, RX-7, 535d Touring, M3, Evo VIII, Supra), upgrades in four price tiers, power stages 1-4, paint and looks.
- **Tracks:** 9 (Kestrel Bay, Neon Strip, Container Maze, Cliffside Run, Mountain Pass, Coast Run, Container Drift, **Drift Ring** and **Serpent Drift**: the last two are curves only).
- **Weather:** clear, rain, snow, with different grip. Rain and snow change how the car slides.
- **Story:** Chapter 1 (4 races), Chapter 2 (6 races, a choice that changes the ending) and the new **Chapter 3 "Blood on the Wall"** (5 races, a final choice, two endings). Six short **cinematics** play at key moments and can be replayed from Crew.
- **Modes:** story, free race, daily challenge, drift maps, online races (friends, room code), **manual gearbox** (with "perfect shift" nitro rewards).
- **Controls:** keyboard, gamepad, phone (tilt, touch wheel, buttons). On a phone you can **move the buttons** (Settings > Controls) and the game is **landscape only**.
- **Music:** 9 generative deep-house songs plus a synthwave track that shuffle and blend into each other by themselves (style Auto by default; Deep house or Synthwave only in Settings > Advanced > Sound). A small "Now playing" line shows each new song (can be turned off).
- **Settings:** Basic and Advanced tabs, graphics Auto (adjusts to the device), subtitles off by default.
- **Tutorial:** four short slides after choosing the language; it says the handbrake is overpowered.
- **Online lap boards (new, waiting for one OK):** your best lap per map, weather and car class goes to an online board (top 10, your rank, a daily-challenge board). The map screen shows the top 3, the results show "#3 of 41". Times are checked for plausibility (speed, length, checkpoints in order), not verified, and say so. Races driven offline are sent later. Beginner assists and drift maps are left out. It starts working once you OK `scripts/apply-server-schema.sh` (it adds three tables, after a backup).
- **Own online lobby (built, not installed):** "Open rooms" list and Quick race on the Online screen; falls back to the old peer-to-peer method when our server is not there. If the host leaves, another player takes over and the race goes on. Install needs your OK (`scripts/setup-server-lobby.sh`) plus the administrator's `/ws/` proxy.
- **Free Drive (Neon Harbor, first version, in this PC's build only):** drive your garage car around the open city from the main menu; Respawn / Pause buttons at the top; the pause menu has fast travel to the six districts and a photo button. Each district has its own look and street lights; rain and snow change the streets; traffic with traffic lights and people on the sidewalks; a minimap, and a full map in the pause menu where a tap sets a GPS route. No missions yet.
- **Feedback and support:** players can send you a message from Crew > Feedback & support, and a "Support the game" tab shows your IBAN (voluntary).

## 2. How it fits together
```
Player's browser (the game)
   |  loads the game files                 |  saves / loads progress, sends feedback
   v                                       v
nginx on notcarlos.mosidealus.nl  --->  PHP API (api/storage.php, api/feedback.php)
(static files; managed by Ansible)           |
                                              v
                                   MySQL 8.0, its own small instance
                                   (127.0.0.1:3307, database "neonspeed")

Online races: browser <-> browser (WebRTC) using the free public PeerJS service.  Your server is not involved.
Code and docs: GitHub (ESPAndroidEZ/neon-speed). Deploy script: scripts/deploy-server.sh
```
- **Progress is stored on your server**, not only in the browser. The browser keeps a copy so the game also works offline.
- Each browser gets a secret **player code** (Settings > Advanced > Game). It is the key to that player's progress: copy it to continue on another device. There are no accounts and no passwords. Whoever has the code has the progress.
- The old Percona cluster database (`mysql.service`) is **disabled**; its data in `/var/lib/mysql` was not touched.

## 3. Things you do (cheat sheet)
Run these in the Claude prompt with `!` in front, or in a WSL terminal. For anything on the server you must be logged in first: `tsh login --proxy=tele.true.nl` (the login expires after about 12 hours: error "cert has expired").

| I want to | Command |
|---|---|
| Put the new version on the website | `~/racer-blood/scripts/deploy-server.sh` |
| Get feedback emails | `FEEDBACK_EMAIL=you@example.com ~/racer-blood/scripts/set-feedback-email.sh` (once) |
| Read what players wrote | `~/racer-blood/scripts/read-feedback.sh 20` |
| Repair or rebuild the game database | `~/racer-blood/scripts/setup-server-db.sh` (safe to repeat) |
| Make a backup of all player data (NOT automated yet) | `tsh ssh root@notcarlos.mosidealus.nl 'mysqldump --defaults-file=/etc/neonspeed-mysql/root.cnf neonspeed' \| gzip > neonspeed-backup.sql.gz` |
| Run all checks | `cd ~/racer-blood && npm run build:q && npm run test:q` |
| Try the game locally | `cd ~/racer-blood && npm run dev` then open http://localhost:5173 |
| Set the git name and email (once, in a WSL terminal) | `cd ~/racer-blood && git config user.name "Karlos Georgiev" && git config user.email "<your email>"` |

## 4. Decisions made
- **Redis: not now.** The server answers in about 50 ms; the network is the slow part. Revisit for leaderboards at scale, our own lobby server, or per-person rate limits. Details: `docs/roadmap-online.md`.
- **Own online lobby: later.** Friends play fine with the current system. Build it when strangers or some phones cannot connect. Details: `docs/roadmap-online.md`.
- **A database cannot raise the frame rate.** It cut the download at every launch (526 KB to 28 bytes when nothing changed). Graphics speed is the browser's job; the Auto quality setting handles it.
- **Subtitles off by default.** The opening cinematic narration and the new cutscenes always show their text.
- **Turbo, rain and snow physics, and the handbrake feel are locked** (you approved them). They are not changed without asking.

## 5. Security and housekeeping to know about
- **Backups (installed 2026-11-20):** the database is dumped every night at 03:30 (14 days kept, `/var/backups/neonspeed`). The first backup was restored into a scratch database and every table matched (`neonspeed-restore-test` PASSED). Our MySQL log rotates weekly.
- **Old firewall rules:** the server firewall still allows ports 3306, 4567, 4568 and 4444 from anywhere (they belonged to the old Galera cluster). Nothing listens on them now. Recommended to remove them; ask whoever manages the server, since the firewall may be managed by Ansible.
- **Mail:** feedback emails come from the server's own mail system, so Gmail may put them in spam. Every message is also stored in the database, so nothing is lost.
- **Your IBAN is in the game's code** and therefore visible to anyone who can see the repository or the website. The repo is listed as public in the notes: decide whether to make it private.
- **Teleport login** expires; the player code is a secret; Ansible manages the nginx config (do not edit it).

## 6. What is NOT verified (honest list)
- Never played on a real iPhone or Android phone by anyone but you and friends: landscape lock, tilt, the button editor and long-press behaviour are only tested in an emulator.
- The engine sound changes (less shrill) were never heard.
- The new Chapter 3 races have not been balanced (are they winnable with your starting cars?).
- The live website was updated on 2026-11-20 (version ab3824f): feedback form, Chapter 3, cinematics, new music and the lap boards (boards answer "not ready" until the tables are added). The feedback email address is still not set: messages are kept in the database.
- Real-device performance of the Auto graphics setting.
- The online lap boards were tested with real AI laps on the server's PHP and with a fake server in the browser, but NOT yet against the real database (the tables need your OK: `scripts/apply-server-schema.sh`, then `node tests/lab/scores-curl.mjs`). Nobody has submitted a real human lap yet.
- The own lobby was tested with two browser windows on this PC and a local server, never on phones or through the real server; on this PC's software graphics the room list took up to a minute to show in a second window (the window was frozen while loading; it retries), so check it on real phones.
- Free Drive was driven only by a bot in a software-rendered browser on this PC (frame rate there is low); never on a phone or a real GPU. Performance on phones is unknown.
- The automatic picture check found the "Neon Night" look less colourful than its target in one race view (was fixed on 19 November, came back with an earlier update, not today's work); logged as QA #13.
- Spanish results screen shows money as "+ $3,000" (English style); the map screen uses "2.500 $". Small, not fixed yet.
- The new song transitions and the four new songs were checked by measurement (no clicks, same loudness), not by ear: listen to `logs/music/join-*.wav` and `logs/music/house-6..9-*.wav`, or just play for a few minutes.

## 7. How the documentation works (so it stays true)
| File | Who reads it | What it holds |
|---|---|---|
| `docs/owner-guide.md` (this) | you | what exists, how to operate it, decisions, risks |
| `docs/changelog.md` | you | what changed, by date |
| `docs/roadmap-online.md` | you and Claude | the online / Redis / leaderboard plan |
| `docs/master-plan.md` | you and Claude | the list of big jobs and the status of each item |
| `docs/prompts/everything.md` | you | the prompt to paste into a new session to start or resume all of it |
| `docs/handoff.md` | Claude | live status, Done and Next, one log line per session |
| `docs/skills.md` | Claude and Qwen | where things live in the code, how-tos, server facts |
| `docs/story.md`, `docs/qa-report.md`, `docs/code-map.md` | Claude | story canon, visual bugs, file index |

**The rule:** after every change the affected documents are updated in the same step, and every session ends with `/checkpoint`, which updates this guide, the changelog and the handoff, commits and pushes. If you ever see this guide disagree with the game, tell Claude: that is a bug in the docs.

## 8. Glossary
- **Deploy:** copy the built game to the web server.
- **Checkpoint:** save the work: docs updated, committed, pushed to GitHub.
- **API:** the small PHP programs on the server the game talks to.
- **Incremental sync:** at launch the game asks only for what changed, not everything.
- **P2P / WebRTC:** players' browsers connect straight to each other.
- **TURN server:** a relay that helps players behind strict networks connect.
- **Teleport (`tsh`):** the secure login tool used to reach the server.
- **Ansible:** the system that manages the server's configuration; some files must not be edited by hand.
