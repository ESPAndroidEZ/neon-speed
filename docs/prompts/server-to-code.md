# Prompt: "do it all, from the server to the code"

How to use: open a NEW Claude Code session in `~/racer-blood`, log in to the server first (`! tsh login --proxy=tele.true.nl`), set your git name and email once if you have not, then paste everything between the lines below. It is long on purpose: it tells the next session what to read, what it may do alone, and where it must stop and ask. Refresh this file whenever `docs/roadmap-online.md` changes (the checkpoint does it).

---

You are working on Neon Speed (`~/racer-blood`), a TypeScript / Three.js browser racing game with a PHP + MySQL server on `notcarlos.mosidealus.nl` (a TEST server, reached with Teleport `tsh`). Do the server-and-code roadmap in `docs/roadmap-online.md`, in its phase order.

**First, read (and only these, do not re-read the code base):** `CLAUDE.md`, `docs/skills.md`, `docs/owner-guide.md`, `docs/handoff.md`, `docs/roadmap-online.md`, `docs/changelog.md`. Use `docs/code-map.md` and Grep to find files; never cat files.

**Do these, in order:**
1. **Phase A** (housekeeping): a daily MySQL backup with 14-day retention and a tested restore into a scratch database; deploy the current version with `scripts/deploy-server.sh`; remind me to run `FEEDBACK_EMAIL=... scripts/set-feedback-email.sh` (you cannot type my email address). Ask me before touching the firewall.
2. **Phase B**: find out whether PHP can see the real client address; if it needs an nginx or Ansible change, write the exact change for me to give the server's administrator and keep the global rate limits until then. Do not edit the nginx config yourself.
3. **Phase C** (leaderboards, MySQL only): `scores` table + indexes in `server/db/schema.sql`, `server/api/scores.php` with validation of the submitted ghost, client module and UI (results screen and track select, English and Spanish), tests (`tests/`), and a curl test on the real server. Reject faked times; mark results "unverified" in the UI.
4. **Phase D** (own lobby / relay): design first. Write the protocol and the systemd unit, build the small Python asyncio WebSocket service on 127.0.0.1:8000 and a client transport next to PeerJS (PeerJS stays as the fallback), with a protocol test using a fake server. STOP and ask me before: installing packages, opening ports, changing nginx, or starting the service on the server. Give me the exact nginx lines the administrator must add (`docs/roadmap-online.md` phase D).
5. **Phase E** (Redis): do NOT start it unless one of the three triggers in the roadmap is true; if so, ask first.

**Rules (all of them, from CLAUDE.md and my instructions):**
- Update ALL affected documentation after EVERY change, in the same step: `docs/handoff.md` (Done + one Log line), `docs/skills.md`, `docs/owner-guide.md`, `docs/changelog.md`, `docs/roadmap-online.md` (phase status), `docs/code-map.md` (`npm run map`), and the memory notes.
- Every `.ts` file under 220 lines (`main.ts`, `game/game.ts`, `core/raceManager.ts`, `ui/menu.ts` are at the limit: add code in new modules). No allocation per frame. Locked: turbo model, rain and snow physics, handbrake feel. English and Spanish for every player-visible text (`tests/i18n-check.mts`).
- After each block: `npm run build:q`, `npm run test:q` (0 FAIL), then commit and push (the git identity is set; never put my email address in a command: a privacy guard blocks it and it must not go into files). Commit messages end with the Co-Authored-By line from the session instructions.
- Anything that changes the server (packages, ports, services, firewall, nginx, deleting data) needs my explicit OK first; read-only checks are fine. Never delete player data without a verified backup.
- Do not claim something works unless you ran it. Report honestly what is untested.
- End the session with `/checkpoint` (it updates the owner guide, changelog and handoff, commits and pushes) and a short summary: what is done, what is verified, what is waiting for me.

Start by telling me your plan for phases A to C in five lines, then begin phase A.

---
