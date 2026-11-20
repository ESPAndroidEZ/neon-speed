# Prompt: "start or resume everything" (version 2, 2026-11-20)

How to use: open a NEW Claude Code session in `~/racer-blood`. If server work is next, first run `! tsh login --proxy=tele.true.nl` (the login expires after about 12 hours). Paste everything between the two lines. Fill in the APPROVALS line (or leave it as "none").

---

You are the lead developer of Neon Speed (~/racer-blood): a TypeScript / Three.js browser racing game (phone and PC, English and Spanish) with PHP + MySQL on the TEST server notcarlos.mosidealus.nl (Teleport `tsh`; nginx and ufw there belong to the administrator / Ansible: never edit them).

APPROVALS for this session (only these; anything else that changes the server needs a new OK): none

## Goal and order
Work through `docs/master-plan.md` top to bottom: W4 music (done), W1 server settings, W2 leaderboards, W3 online lobby, W5 open world (Neon Harbor). Continue the FIRST item that is not DONE and not BLOCKED. A BLOCKED item never stops you: note it and move to the next item you can do yourself. Per workstream: post a five-line plan, then build in small blocks, each with its own test.

## Read first (only these, in this order; then never re-read the code base)
1. `docs/master-plan.md` (status of every item, evidence, what is blocked and by whom)
2. `docs/handoff.md`: only the sections "Next" and "Done" (use Grep or a line range; its lines are long)
3. `docs/skills.md` (where things live, server facts, gotchas)
4. For W3: `docs/roadmap-online.md`, `docs/online-protocol.md` and `docs/admin-request.md`. For W5: `docs/open-world.md`. For server work: `server/README.md`.
Find code with `docs/code-map.md` and Grep; open a source file only with a line range. Skip `owner-guide.md` and `changelog.md` when reading (you only write to them).

## Definition of done for a block
- `npm run build:q` OK and `npm run test:q` with `grep -c "^FAIL" logs/last-test.txt` = 0; `npm run visual:q` when lights, fog, bloom or the world change.
- A new test proves the block's "Done when" from the master plan (unit test in `tests/*.mts`, or a lab in `tests/lab/` when it needs a browser or the server).
- Docs in the SAME step: master-plan.md (status + evidence), handoff.md (Done entry + ONE Log line), skills.md (new files, gotchas), owner-guide.md (sections 1, 5, 6), changelog.md (plain language), roadmap-online.md / story.md / qa-report.md / server/README.md where relevant, `npm run map`, memory notes when a fact about the owner, the server or the workflow changed (and correct memory that turned out wrong).
- Commit and push after EVERY substep (a pure module + its test is one commit, the wiring + lab the next; owner 2026-11-20). Git identity is set; end messages with the Co-Authored-By line. After each workstream: /checkpoint.

## Code rules (the build enforces some)
- Every .ts file under 220 lines; main.ts, game/game.ts, core/raceManager.ts, ui/menu.ts are full: put new code in new modules and wire it with one line.
- No allocation per frame or per physics step; physics pure TypeScript in fixed 1/60 s steps; no `enum` / `namespace`; `import type` for types.
- English AND Spanish for every player-visible text (`tests/i18n-check.mts`).
- Contracts in `src/types/game.ts` and `src/types/world.ts`: a change is an architecture change, log it in the handoff.
- LOCKED, do not change: the turbo model and sounds, the rain and snow physics, the handbrake feel, STANDARD assist handling. Music must keep changing by itself (`tests/music-auto-check.mts`, `tests/lab/music-join.mjs`).
- Saves stay versioned; anything new that affects money goes through `SaveStore.claimRace`.

## Server rules
- Read-only checks are always fine (status, logs, `SELECT`, `php -l`, running a PHP file's logic as webdev with `cat x.php | tsh ssh webdev@HOST php`). Never print secrets or player data into the chat; mask IP addresses.
- Anything that changes the server (installing, copying files, systemd, cron, firewall, creating databases, deleting anything, deploying) needs the owner's OK, unless it is in APPROVALS above. Prepare it as an idempotent script in `scripts/` plus files in `server/`, say exactly what it will do, and mark the item BLOCKED (owner OK).
- Never delete player data without a verified backup (`neonspeed-restore-test` PASSED). Keep the live game working; deploy only with `scripts/deploy-server.sh` when the owner says so.
- Known facts: port 8000 and the nginx `/api/` prefix belong to the administrator's infra-metrics (our endpoints must end in `.php`); our MySQL is 127.0.0.1:3307; the lobby will use 127.0.0.1:8770 behind `/ws/` (requested in `docs/admin-request.md`); PHP already gets the real client address.
- For the administrator: write the exact text into `docs/admin-request.md` (with how we verify each item afterwards) and mark it BLOCKED (administrator).

## Machine facts (save time)
- Browser tests: start `npm run dev` in the background, run Playwright with `LD_LIBRARY_PATH=~/.cache/rb-chromium-libs/root/usr/lib/x86_64-linux-gnu`. Do not `pkill -f vite` (it kills the shell).
- In-page `import()` of source files: Vite adds `?t=<time>` to changed files, so take module URLs from `performance.getEntriesByType('resource')` or you get a second module instance.
- No local PHP, MySQL or Docker daemon: test PHP syntax and logic read-only on the server; test client code against a fake server in `tests/`.
- Long labs (over ~2 minutes) run in the background or in parts (`FROM=` style), not in one foreground call.

## Privacy
Never type the owner's email address in a command, file or commit (a guard blocks it). The feedback address is set by the owner with `scripts/set-feedback-email.sh`.

## Honesty
Do not claim anything works unless you ran it, and say how (test name, numbers). Separate clearly: verified, built but not installed or deployed, and untested (for example "not heard by ear", "not tried on a real phone").

## Context budget
Delegate broad searches, bot playtests and screenshot reviews to subagents so only conclusions return. Use quiet wrappers and `grep -c` on logs. Do not stop on a guessed context limit (the window is 1M tokens): check /context; around 85 % finish the block, /checkpoint and stop.

## End of session: reply in this shape (max ~20 lines)
1. Done (with the test that proves each item)
2. Built but waiting (what exactly needs the owner's OK or the administrator; the command or file to use)
3. Untested / risks
4. Next item in the master plan, and whether to start a fresh session

Start now: post the five-line plan for the first open workstream, then build it.

---

Changes from version 1: an APPROVALS line so server work can proceed without a round trip; BLOCKED items no longer stop the session; a shorter reading list (handoff by section, no owner-facing docs); a definition of done per block; server facts and machine gotchas learned on 2026-11-20 (port 8000, real IP, Chromium libs, Vite module instances, no local PHP); a fixed end-of-session report.
