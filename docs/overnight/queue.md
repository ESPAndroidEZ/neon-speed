# Overnight queue

Order matters. The runner (`scripts/overnight.sh`) re-launches Claude until no `- [ ]` is left, the deadline passes, or STOP exists.
States: `- [ ]` open, `- [x]` done (result appended), `- [!]` blocked (reason appended). Details in `docs/overnight/tasks/`.
Morning review: `docs/overnight/report.md`, then `git log main..HEAD --oneline`.
Carlos's priorities tonight (2026-11-16): the rename to Neon Speed, different good sounds for every car, house music, better-looking cars, a better story, then anything that makes the game better.

- [ ] 01 Baseline: build, tests, smoke on this branch (tasks/01-baseline.md)
- [ ] 10 Rename the game to Neon Speed everywhere players see it (tasks/10-rename-neon-speed.md)
- [ ] 11 Every car gets its own engine sound (tasks/11-car-sounds.md)
- [ ] 12 Procedural house music engine, menu + race (tasks/12-house-music.md)
- [ ] 13 Redesign all eight cars (tasks/13-car-design.md)
- [ ] 14 Story rewrite: better arcs, characters, dialogue, EN + ES (tasks/14-story.md)
- [ ] 15 Menus, HUD and first impression polish (tasks/15-ux-polish.md)
- [ ] 03 Hide dev-only keys from the player HUD (tasks/03-hud-dev-keys.md)
- [ ] 02 Main menu layout + viewport check in EN and ES (tasks/02-menu-viewport.md)
- [ ] 05 Language switch keeps garage car and open subtitle (tasks/05-lang-switch-state.md)
- [ ] 04 Spanish pass: leftovers and tone, after the story rewrite (tasks/04-spanish-pass.md)
- [ ] 06 Per-frame / per-step allocation audit (tasks/06-allocation-audit.md)
- [ ] 07 Structural debt: split the biggest files at their seams (tasks/07-structural-debt.md)
- [ ] 08 Review finished Qwen branches (tasks/08-qwen-review.md)
- [ ] 09 Docs in sync, full verification (tasks/09-final.md)
- [ ] 99 Self-directed improvements, standing item, never ticked (docs/overnight/ideas.md)

## Needs Carlos (never do these overnight)
- Handling v2 as default, snow handling tuning, anything in the LOCKED list in CLAUDE.md.
- Tilt steering on real phones (needs a phone), money, licences, downloaded assets or tracks.
- Merging `overnight/*` into `main`.
