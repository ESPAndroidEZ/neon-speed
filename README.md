# Racer's Blood

Night street racer in the browser, with rain and snow. TypeScript, Three.js, Vite.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # line check + typecheck + production build
npm test         # headless physics, track and collision checks (tests/*.mts)
```

Controls: W/S gas and brake (brake from a stop reverses), A/D steer, Space handbrake, Shift nitro, R reset to track, 1/2/3 weather, M mute, Esc menu, backtick tuning panel.
Car models: drop GLBs into `public/models/<id>.glb` (see `docs/assets/tripo-brief.md`); `scripts/optimize-models.sh` shrinks them. Missing files fall back to the procedural cars.
Dev URL flags: `?skip` (no menu), `?ai=3`, `?car=evo`, `?w=rain`, `?at=tunnel`, `?demo`, `?ff=10`, `?screen=garage|story|weather|settings`.

Working with the AI agents: see `CLAUDE.md` (Claude Code) and `AGENTS.md` (Qwen via Aider). Plan: `docs/plan.md`. Story: `docs/story.md`.

## Local Qwen

```bash
scripts/start-qwen.sh                                   # llama.cpp server on 127.0.0.1:8080
export OPENAI_API_BASE=http://127.0.0.1:8080/v1 OPENAI_API_KEY=local-dummy-key
git worktree add ../racer-qwen -b qwen/001-asset-loader # once per task
cd ../racer-qwen && scripts/qwen.sh 001                 # runs the task, builds, commits
```

Then in Claude Code (main folder): `/review-qwen 001`.
