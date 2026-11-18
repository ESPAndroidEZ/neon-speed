# 06 Per-frame / per-step allocation audit

Rule from CLAUDE.md: no allocation in per-frame or per-step code; reuse vectors. Physics is pure TS (no `three` imports in `src/physics`) and advances in fixed 1/60 s steps only.

1. Find hot paths: step/update/tick/render functions in `src/physics`, `src/core`, `src/camera`, `src/fx`, `src/game`. Use `docs/code-map.md` first, then grep inside those directories for `new Vector`, `new Quaternion`, `new Color`, `.clone()`, array literals `[` returned or built in step functions, `{ x:`-style object literals, `.map(`/`.filter(`/spread in per-frame code.
2. Also check the purity rule: `grep -rn "from 'three'" src/physics` must be empty.
3. Fix real violations by hoisting a module-level scratch object or a preallocated field. Do NOT change numeric behaviour: `tests/save-roundtrip.mts`, `tests/balance-check` and `tests/camera-check.mts` must stay identical in outcome. Do not touch the turbo model, stability (handbrake/drift hold) or weather physics code at all, even if you find allocations there: list them in the report instead.
4. Allocations in setup, menu, load, or event handlers (not per-frame) are fine; leave them.
5. If you can, measure: `scripts/soak.mjs` exists; run it before and after if it works headless, and note the result. If it does not work in this environment, skip and say so.

Report: table of fixed spots (file:line, what), and the list left untouched because they are in a LOCKED area.

Done when: fixes committed, tests green, report written.
