# 09 Final verification

1. Follow the sync-docs skill: make `docs/` match the code (code-map, plan, handoff "Done"). Add the dated "Overnight round" paragraph to `docs/handoff.md`; leave the Baton line alone.
2. Run `npm run build:q`, `npm run test:q`, `npm run smoke`, and if a dev server can be started with `scripts/with-dev.sh`, `npm run visual` (bad weather must stay readable) and `npm run lang`.
3. `git diff main --stat | tail -5` and write a morning summary at the TOP of `docs/overnight/report.md` (three lines: what was done, what is blocked, what Carlos should look at first, with the branch name).
4. Commit, `git push -u origin HEAD`. Do not merge.
5. Item 99 is still open, so do NOT print `OVERNIGHT-DONE` here: end this session with `OVERNIGHT-CONTINUE`.
