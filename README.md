# Racer's Blood

Night street racer in the browser, with rain and snow. TypeScript, Three.js, Vite.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # line check + typecheck + production build
```

Working with the AI agents: see `CLAUDE.md` (Claude Code) and `AGENTS.md` (Qwen via Aider). Plan: `docs/plan.md`. Story: `docs/story.md`.

## Local Qwen

```bash
scripts/start-qwen.sh                                   # llama.cpp server on 127.0.0.1:8080
export OPENAI_API_BASE=http://127.0.0.1:8080/v1 OPENAI_API_KEY=local-dummy-key
git worktree add ../racer-qwen -b qwen/001-asset-loader # once per task
cd ../racer-qwen && scripts/qwen.sh 001                 # runs the task, builds, commits
```

Then in Claude Code (main folder): `/review-qwen 001`.
