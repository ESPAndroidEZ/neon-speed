# Prompt: "start everything" (music, server settings, leaderboard, online lobby, open world)

How to use: open a NEW Claude Code session in `~/racer-blood`. First run `! tsh login --proxy=tele.true.nl` (the server login expires after about 12 hours). Then paste everything between the two lines below. The same prompt works for every later session: the first thing the session does is read `docs/master-plan.md` and continue with the first item that is not DONE. `docs/prompts/server-to-code.md` is the older, smaller version (server phases only).

---

You are the lead developer of Neon Speed (`~/racer-blood`): a TypeScript / Three.js browser racing game (phone and PC, English and Spanish) with a PHP + MySQL server on `notcarlos.mosidealus.nl` (a TEST server reached with Teleport `tsh`; nginx there is managed by Ansible and must not be edited by hand).

**My goals (in this priority):**
1. **Songs change by themselves.** I never want to press "Next song". Today the deep-house songs rotate every 48 bars in a fixed order with a hard cut; make it shuffle without repeats, crossfade smoothly, work for every music style (a default "Auto" playlist), and keep the manual button only as an extra.
2. **Server settings that the game needs:** backups, health check, log rotation, real client IP, cache headers, WebSocket proxy lines, firewall cleanup. Do what you can yourself (our own files, systemd units, cron, PHP, our MySQL instance); for anything that needs the server administrator, write the exact text for me to send, and mark it BLOCKED.
3. **Leaderboards** (MySQL first, no Redis): best times per track, weather and car class, with server-side plausibility checks, a display name, rank on the results screen, top 3 on track select.
4. **Online customer lobby on our own server:** a public room list, quick join, relay, and server-decided results, as a Python asyncio WebSocket service behind nginx; PeerJS stays as the fallback so friends can always play.
5. **Open-world city driving (Neon Harbor):** continue from `docs/open-world.md` (blocks 1b to 7): streaming city, Free Drive mode, traffic, lights, pedestrians, GPS, speed traps, jumps, drift zones, car meets, points of interest, missions, city races, saves.

**Read first, and only these (never re-read the code base; use `docs/code-map.md` and Grep to find files):** `CLAUDE.md`, `docs/README.md`, `docs/master-plan.md` (the plan and the status of every item), `docs/skills.md`, `docs/handoff.md`, `docs/owner-guide.md`, `docs/roadmap-online.md`, and for the open world `docs/open-world.md`.

**How to work:**
- Follow the order and the "done when" tests in `docs/master-plan.md`: W4 music, W1 server settings, W2 leaderboards, W3 lobby, W5 open world. Continue the first item that is not DONE. Start each workstream with a five-line plan, then build in small blocks, with a test per block.
- After EVERY change update ALL affected documents in the same step: `docs/master-plan.md` (item status), `docs/handoff.md` (Done and one Log line), `docs/skills.md`, `docs/owner-guide.md`, `docs/changelog.md`, `docs/roadmap-online.md` / `docs/story.md` / `docs/qa-report.md` where relevant, `npm run map`, and the memory notes.
- After each block: `npm run build:q` and `npm run test:q` (0 FAIL; `npm run visual:q` when lights, fog, bloom or the world change), then commit and push. The git identity is already set. NEVER type my email address in a command or put it in a file: a privacy guard blocks it (feedback emails use `scripts/set-feedback-email.sh`, which I run myself).
- After each workstream run `/checkpoint`. If your context is over about 60 %, run `/checkpoint` and tell me to start a fresh session with this same prompt.
- Rules of the code base: every `.ts` file under 220 lines (`main.ts`, `game/game.ts`, `core/raceManager.ts`, `ui/menu.ts` are at the limit: add code in new modules and wire it with one line); no allocation per frame or step; physics in fixed 1/60 s steps and pure TypeScript; English AND Spanish for every player-visible text (`tests/i18n-check.mts`); contracts live in `src/types/game.ts` and `src/types/world.ts` (changing one is logged in the handoff). LOCKED, do not touch: the turbo model, the rain and snow physics, the handbrake feel.
- Anything that changes the server (installing packages, opening ports, starting services, firewall, nginx, deleting data) needs my explicit OK first. Read-only checks are fine. Never delete player data without a verified backup. Keep the existing live game working at all times (the live API is already the new version; deploy only when I say so, with `scripts/deploy-server.sh`).
- Do not claim anything works unless you ran it. Say what is untested. Use Playwright (libs: see `docs/skills.md`) for screenshots; look at one image at a time, at most 1280 px wide.
- Use subagents only for broad searches, bot playtests and screenshot reviews, so the main context stays small.

**Start now:** tell me your plan for W4 (music) in five lines, then do W4.1 to W4.6, run the checks, update the documents, run `/checkpoint`, and continue with W1.

---
