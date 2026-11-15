# 07 Structural debt: split big files at their seams

The build enforces 220 lines per `.ts` file, so debt hides as files at 195-220 lines that are one edit from failing, and as functions doing many jobs.

1. List the largest files: `find src -name '*.ts' | xargs wc -l | sort -rn | head -25`.
2. Pick at most THREE files above ~205 lines that have an obvious seam (a group of pure helpers, a data table next to logic, a UI builder next to its state). Skip anything in `physics/drivetrain`, `physics/stability`, `audio/turboSound` and the weather/grip code (LOCKED), and skip `src/types/*`.
3. Move code only: no renames of exported symbols, no behaviour change, no new abstractions. Re-export from the old module if other files import the moved symbols, so the diff stays small. Follow the folder's existing naming (e.g. `fooHelpers.ts`).
4. After each split: `npm run build:q` and `npm run test:q`. Update `docs/code-map.md` with `node scripts/gen-code-map.mjs` if that is how it is produced.
5. One commit per split.

Done when: up to three splits committed with green build/tests, or a report line saying no safe seam was found.
