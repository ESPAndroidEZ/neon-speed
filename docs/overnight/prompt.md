You are running UNATTENDED overnight on NEON SPEED (formerly Racer's Blood). Carlos is asleep and has said: DO NOT ASK QUESTIONS, just keep working and improve the game. Nobody can answer; any question you ask is wasted. Decide, log the decision in `docs/overnight/report.md`, continue.

This exact prompt is re-sent every time a session ends or a usage limit resets, so all state lives in files, not in your memory.

Start of every session (keep reads small, follow CLAUDE.md token discipline, including its "2026-11-16 owner" decisions):
1. Read CLAUDE.md, `docs/overnight/queue.md`, and the last 40 lines of `docs/overnight/report.md`.
2. `git status -sb`. You must be on a branch named `overnight/*`; if not, `git checkout overnight/2026-11-16` (or create `overnight/<today>`). Never work on `main`.
3. If the tree has uncommitted changes, a previous session was cut off (timeout or limit). Look at `git diff --stat`: if it is a coherent, building piece of the task in `queue.md`, finish and commit it; if it is broken or unrelated, `git checkout -- .` those files and redo the task.
4. Take the FIRST `- [ ]` item in the queue, open its task file in `docs/overnight/tasks/`, and do it. Big tasks have sub-checklists inside their task file: tick those as you go so a fresh session knows where to resume.

Per task:
- Work in small steps. Verify with `npm run build:q` and `npm run test:q` (zero errors) plus whatever the task file asks for. Look at real output when the task is visual or audible-by-numbers (screenshots downscaled to <= 1280 px, via a subagent when there are many; `npm run visual`; the audio level script `scripts/audio-level.mjs`).
- Green: commit only the files you touched (never `git add -A`), message ending with the Co-Authored-By trailer you normally use, then `git push -u origin HEAD` (ignore push failures, note them once in the report).
- When a task is fully done, change its queue item to `- [x]` and append ` -- <one-line result>`; append a short entry (what changed, what you verified, anything Carlos should look at or listen to) to `docs/overnight/report.md`.
- Red and not fixable in two honest attempts: undo your own changes for that task, mark the item `- [!]` with the reason, add it to the report, move on. Never leave the build red at a commit.
- You normally stay in ONE long session: when you stop talking between tasks, the runner sends you a message starting with `[nudge N]` telling you to continue with the next open item. Treat it exactly like this prompt. Do not end your turn early just to be tidy; keep going through the queue.
- Only when your context is more than ~60 % full: finish the current step cleanly, commit, and end with the single last line `OVERNIGHT-CONTINUE`. The runner then starts a brand-new session that picks up from the files. Never print that line, or `OVERNIGHT-DONE`, in any other situation.

If the file `docs/overnight/STOP` exists, finish the step you are on, commit it if green (otherwise undo it), and end with `OVERNIGHT-DONE: stopped by STOP file`.

RAM/CPU hygiene (Carlos wants the PC to do nothing but this one session; the box has 8 cores and 15 GB, and the Qwen server is stopped on purpose, do not start it, do not use Docker):
- Prefer node-only checks (`build:q`, `test:q`, the offline audio/story/car tests). Run browser jobs (`npm run visual`, `car-shots`, `viewport-check`, screenshots) only once per finished piece of work, never two at once, and only if `awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo` shows >= 4000 MB.
- Start no background services other than `scripts/with-dev.sh`, which cleans up after itself. Before every `OVERNIGHT-CONTINUE` and after every browser job, make sure nothing of yours is left running: `ps -eo pid,args | grep -E "[v]ite|[c]hrome-headless|[p]laywright"`, and `kill` those PIDs (never `pkill -f`, it matches your own shell).
- Do not launch other Claude sessions or subagents for bulk work; do the work in this session. A single Explore subagent for screenshot review is fine.

Item 99 ("self-directed") is a standing item: never tick it. When you reach it, read `docs/overnight/ideas.md`, pick the single highest-value idea (or invent a better one: gameplay feel, menus, HUD, performance, mobile, accessibility, juice, tests), do it with the same discipline, log it in the report and in the "done" list of `ideas.md`, and end with `OVERNIGHT-CONTINUE`. Only print `OVERNIGHT-DONE` if the ideas are truly exhausted or the build cannot be kept green.

Never, under any circumstances:
- Touch `main`, merge into it, force-push, rewrite history, or delete branches.
- Change anything LOCKED in CLAUDE.md: the turbo model and its audio (`physics/drivetrain` boost, `audio/turboSound`), the approved rain/snow physics, STANDARD assist handling, the handbrake/drift hold in `physics/stability`, camera-shake rules, the save-system contract. Do not change `src/types/game.ts` or `src/types/people.ts` contracts.
- Change internal identifiers during the rename (repo name, `com.racersblood.game`, save/localStorage keys): saves must keep loading.
- Make the "needs Carlos" decisions in `queue.md` (handling v2 as default, tilt on real phones, money or licences).
- Add npm dependencies, install global tools, download assets or music, or call external services other than `git push` to the existing remote. Everything audible and visible is generated in code.
- Commit secrets, large binaries, or logs.
If a task seems to require one of these, do the part that does not, mark the rest in the report, and move on.

Quality bar: this is a game people should enjoy. Prefer a few things that are clearly good over many that are half done. Keep every `.ts` file under 220 lines, no `enum`, `import type` for types, no allocation in per-frame code (CLAUDE.md hard rules).
