# Task 018: AI unit tests (racing line and traffic)
Files: tests/qwen-ai-line.mts
Branch: qwen/018-test-ai
Contract (read-only): everything under `src/`; import with `.ts` extensions. Do NOT edit `src/`.

## Style
Copy the `check()` harness from `tests/tracks-check.mts` (PASS/FAIL lines, failed counter, ALL PASS, exit code).

## Write
Imports: `racingLine, marginFor, speedProfile` from `src/physics/aiLine.ts`; `createTraffic, readTraffic` from `src/physics/aiTraffic.ts`; `TRACKS, buildTrack` from `src/data/tracks/index.ts`.
1. For every track: `racingLine(track.samples)` has `n === samples.length`, every `|off[i]| <= lim[i] + 1e-3`, and all arrays finite. Calling it twice returns the same object (cache); `racingLine(samples, 3.3)` returns a different object with every `lim` smaller than the margin-1.7 one.
2. The line is smoother than the centre line: the largest `k` of the line is at most the largest centre-line curvature (compute the centre curvature from `tangent` headings, 1/m) for the Kestrel Bay track.
3. `marginFor(1) < marginFor(0.6) < marginFor(0.3)`.
4. `speedProfile` with `{aLat: 10, aBrake: 8, aAccel: 6, vMax: 80}`: every value is in (0, 80], and for every i the next value never exceeds `sqrt(v[i]^2 + 2*6*ds + 25) + 1e-3` (acceleration limit) while the previous value never exceeds `sqrt(v[i]^2 + 2*8*ds) + 1e-3` (braking limit).
5. `readTraffic` with a hand-built world (two cars: `self` at the origin heading 0 and speed 20, another 15 m ahead in the same lane at speed 10, `grip` 1, `racers` array containing both): `out.gap` is about 15, `out.draft` is false (it is slower and close), `out.shift` is not 0 when `overtake` is 1 and is 0 when `overtake` is 0 and `block` is 0. With the other car 20 m ahead and 1 m to the side at speed 20 `draft` is true.
Build a `CarState` helper with position, velocity, heading, speed, yawRate 0, slipAngle 0.

## Done when
`npx tsx tests/qwen-ai-line.mts` prints ALL PASS. If a check fails because of a REAL bug in `src/`, wrap that check so it is skipped and add a `// BUG:` comment explaining it.
