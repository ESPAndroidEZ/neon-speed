# Task 002: AI racer policy
Files: src/physics/aiRacers.ts tests/ai-check.mts
Branch: qwen/002-ai-racers
Contract (read-only): `AIRacerAgent`, `AIWorldView`, `CarState`, `CarInput`, `TrackSample` in src/types/game.ts

## Export exactly
```ts
export function createAIRacer(id: string, name: string, skill: number): AIRacerAgent;
```

## Context (final code, do not edit it)
- `src/core/raceManager.ts` calls `agent.decide(1/60, self, world)` once per fixed step for each AI, then steps its car. The track is `world.track`: a closed loop of `TrackSample` every 3 m (1.4 km, 14 m wide, so ~470 samples); `world.racers` are the `CarState` of every car (player included, index `world.playerIndex`).
- Cars: 0-100 km/h in about 5.5 s, top speed 220-290 km/h, grip about 1.2 g in the dry; weather can cut grip to 0.45 (AI does not see weather: just stay conservative at low `skill`).
- `tests/race-check.mts` contains a working 30-line pure-pursuit pilot (look-ahead `6 + 0.3*speed` m, speed target `sqrt(a_lat / curvature)` with a_lat 8 to 12 m/s^2). Use it as the starting point and improve it; it finishes laps but drives one racing line and shoves other cars.
- The architect hooks agents into `Game.startRace` after review; you only write the policy and its test.

## Behaviour
- Pure policy: `decide(dt, self, world)` returns a `CarInput`. No physics, no meshes, no `three` imports.
- Steering: pure pursuit on `world.track`. Remember the last nearest-sample index and search only +/-14 samples around it (O(1)). Convert the heading error to `steer` (`+1` is LEFT: error > 0 means the target is to the left), clamp to [-1, 1].
- Speed: target speed from upcoming curvature (angle between tangents 10 to 45 samples ahead). Brake early for hairpins. `skill` (0..1) scales pace (a_lat 8 + 4*skill) and braking commitment.
- Lines: each AI gets a stable lateral offset in [-3, 3] m from `id` so a pack spreads out; overtake by shifting 2.5 m away from a car within 10 m ahead.
- Rubber band: compare progress to the player (nearest-sample index difference). Behind: up to +6% pace. Far ahead: up to -8%. Scaled by `skill`.
- Deterministic: any noise comes from a small seeded PRNG built from `id`. Outputs stay in range (throttle and brake 0..1, steer -1..1, handbrake false, nitro false).
- No allocation inside `decide`: return one reused `CarInput` object per agent.

## Test (tests/ai-check.mts, same style as tests/race-check.mts, run by `npm test`)
4 AI (skills 0.2, 0.5, 0.8, 1.0) plus a parked player complete 2 laps with no NaN; fastest solo lap time decreases with skill; no AI spends more than 5% of the race beyond the kerb (|lateral| > 7.5 m).

## Done when
`npm run build` and `npm test` pass, files under 220 lines, only listed files changed.
