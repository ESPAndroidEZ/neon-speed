# Task 044: Unit tests: classes, parts catalog, setups
Files: tests/qwen-rules.mts
Branch: qwen/044-test-rules
Contract (read-only): everything else. Do NOT edit anything in `src/`.

## Reference implementation (read it first, copy its shape)
tests/tuning-check.mts and tests/city-check.mts (the harness and style); src/physics/carRating.ts, src/data/upgrades.ts, src/data/setup.ts, src/data/partsCatalog.ts

## Exact signature
```ts
// a test file, no exports
```

## Write
Copy the `check()` harness. Tests: (1) `classOf` is monotonic in PR from 0 to 1200 and `allowedInClass` agrees with `classOf` for every pair of classes; (2) for every upgrade category and level, `applyUpgrades` changes only fields of CarTuning that exist and keeps `mass`, `torque`, `grip` positive on every car; applying the same upgrades twice to fresh tunings gives equal results; (3) each `Setup` slider at min and max gives finite tuning numbers and `brakeBias` stays within 0.5..0.78; (4) every `CATALOG` entry has `partPrice` equal to its price and its `id` exists in `PARTS[slot]`; (5) `sanitizeSetup` of random garbage objects (arrays, strings, nested) always returns a value inside `SETUP_RANGES`. Import with `.ts` extensions. Do NOT edit `src/`.

## Validation
`npx tsx tests/qwen-rules.mts` prints ALL PASS. If a check fails because of a REAL bug in `src/`, wrap that single check so it is skipped and add a `// BUG:` comment.

## Done when
`npm run build` passes, only `tests/qwen-rules.mts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
