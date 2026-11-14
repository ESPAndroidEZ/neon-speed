# Racer's Blood

Night street racer in the browser, with rain and snow. TypeScript, Three.js, Vite.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # line check + typecheck + production build
npm run visual   # Playwright weather screenshots + luminance/contrast assertions (needs npm run dev)
npm run smoke    # browser smoke test (needs `npm run dev` and Chrome)
npm test         # headless physics, track and collision checks (tests/*.mts)
```

Controls: W/S gas and brake (brake from a stop reverses), A/D steer, Space handbrake, Shift nitro, R reset to track, 1/2/3 weather, M mute, Esc pause (Resume, Restart, Save, Save & Quit), P particle showcase, K audio test panel, backtick tuning panel. Main menu: Continue / Load (3 slots + autosave).
Car models: drop GLBs into `public/models/<id>.glb` (see `docs/assets/tripo-brief.md`); `scripts/optimize-models.sh` shrinks them. Missing files fall back to the procedural cars.
Dev URL flags: `?skip` (no menu), `?ai=3`, `?car=evo`, `?w=rain`, `?at=tunnel`, `?demo`, `?ff=10`, `?screen=garage|story|maps|crew|settings`, `?track=neon|maze|cliff|maze-drift|kestrel`, `?event=c2-neon` (a story event).
More: `node scripts/map-shots.mjs` (screenshots of every map into `logs/maps/`), `scripts/qwen-queue.sh 012 013 ...` (unattended Qwen tasks).

Working with the AI agents: see `CLAUDE.md` (Claude Code) and `AGENTS.md` (Qwen via Aider). Plan: `docs/plan.md`. Story: `docs/story.md`.

## Local Qwen

```bash
scripts/start-qwen.sh                                   # llama.cpp server on 127.0.0.1:8080
export OPENAI_API_BASE=http://127.0.0.1:8080/v1 OPENAI_API_KEY=local-dummy-key
git worktree add ../racer-qwen -b qwen/001-asset-loader # once per task
cd ../racer-qwen && scripts/qwen.sh 001                 # runs the task, builds, commits
```

Then in Claude Code (main folder): `/review-qwen 001`.
