# Task 045: Handbrake slide goes the wrong way (owner bug report)
Status: DONE by Claude on 2026-11-15 (fixed in src/physics/stability.ts, regression in tests/handling-check.mts). Do not run.
Files: src/physics/stability.ts
Branch: qwen/045-handbrake-slide

## Bug
While steering, holding the handbrake makes the car over-rotate toward 180 degrees
(U-turn / reverse) instead of sliding sideways toward the steered direction.
Repro (headless): 20 m/s, steer left, handbrake 1.5 s -> heading +114 deg, u goes
negative (reverse), travel direction ends at -60 deg (RIGHT) of the original path.
Symmetric for right. Short taps at low speed also U-turn.

## Root cause
In `stability.ts` the slide-limiting effects (`slideYaw` restoring moment,
`slideDamping`) fade to exactly 0 while the handbrake is on
(`free = smoothstep(handbrakeGrip, 1, hb)`), so nothing limits the slide angle
while the rear is loose. The front axle still produces ~78% of peak lateral force
at 90+ deg slip, its yaw moment is unbalanced, and the rotation continues until
the car is reversed.

## Fix
Keep a partial share of the slide-limiting effect during the handbrake
(`free = FLOOR + (1 - FLOOR) * smoothstep(...)` in `slideYaw`), so a handbrake
slide settles at a large but bounded angle with forward speed kept. Low-speed
handbrake turns (< 4 m/s) are unaffected because the speed ramp already
zeroes the effect there.

## Done when
- Headless probe: handbrake + steer left settles at a bounded slide angle
  (no 180 deg pivot, u stays positive, travel stays on the left side);
  symmetric for right.
- `npm run test` (incl. handling bot regression), `npm run typecheck`,
  `npm run build` all green.
