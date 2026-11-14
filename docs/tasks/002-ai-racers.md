# Task 002: AI racer policy
Files: src/physics/aiRacers.ts
Branch: qwen/002-ai-racers
Contract (read-only): `AIRacerAgent`, `AIWorldView`, `CarState`, `CarInput`, `TrackSample` in src/types/game.ts

## Export exactly
```ts
export function createAIRacer(id: string, name: string, skill: number): AIRacerAgent;
```

## Behaviour
- Pure policy: `decide(dt, self, world)` returns a `CarInput`. No physics, no meshes, no `three` imports.
- Steering: pure pursuit on `world.track`. Remember the last nearest-sample index and search only a few samples ahead (O(1) per call). Aim at a lookahead point whose distance grows with speed. Convert the heading error to `steer` (remember `+1` is LEFT), clamp to [-1, 1].
- Speed: target speed from upcoming curvature (angle between tangents a few samples ahead). Brake before tight corners. `skill` (0..1) scales pace, braking commitment and how close to the limit it drives.
- Avoidance: if another racer in `world.racers` is ahead within about 8 m, offset the aim point sideways, away from it.
- Rubber band: compare progress to `world.racers[world.playerIndex]`. Behind the player, a little extra pace. Far ahead, a little less. Bounded to about +/-8%, scaled by `skill`.
- Deterministic: any noise comes from a small seeded PRNG built from `id`. Outputs stay in range (throttle and brake 0..1, steer -1..1).
- No allocation inside `decide`: keep scratch numbers as fields.

## Done when
`npm run build` passes, the file is under 220 lines, only the listed file changed.
