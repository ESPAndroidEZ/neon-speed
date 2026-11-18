# 01 Baseline

Goal: know the branch starts green, so later failures are yours.

1. `npm run build:q`, `npm run test:q`, `npm run smoke`. Read results only with grep or a line range from `logs/last-*.txt`.
2. Red: find the cause with `git log -5 --stat` and the failing test name. Fix only if it is small and clearly not in a LOCKED area; otherwise mark `- [!]`, record the exact failing test in the report, and continue (later tasks still run, but compare against this baseline).
3. Report: numbers of tests passed/failed, build time, anything already failing before you touched code.

Done when: the baseline is written in `report.md`.
