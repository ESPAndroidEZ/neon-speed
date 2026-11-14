# Qwen task rules (learned the hard way, session 5)
- ONE new file per task, under about 100 lines (the model's output limit is 8192 tokens: bigger files get cut and committed as nothing).
- Data tasks: typed constants only, short lines, no logic. Test tasks: the `check()` harness copied from `tests/tracks-check.mts`.
- Never edit anything under `src/` unless the Files line lists it. The architect wires finished modules in.
- `scripts/qwen-queue.sh` logs EMPTY when a branch changed nothing but the baton line: re-run it with a smaller task.
