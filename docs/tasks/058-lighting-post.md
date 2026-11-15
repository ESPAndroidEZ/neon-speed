# Task 058: Lighting and post-processing (bloom haze, brake lights, vent mist)
Files: src/render/lookConfig.ts src/world/steam.ts
Check: scripts/with-dev.sh 'node scripts/nitro-check.mjs --base $BASE'
Branch: qwen/058-lighting-post
Contract (read-only): LOOK_CONFIG in src/render/lookConfig.ts (read its header: you may change numbers only); ParticlePool in src/fx/particles.ts

## Why
Streetlights wash buildings in yellow haze, brake lights look dull, and vents shoot a white vertical steam column.

## Behaviour
1. lookConfig bloom: raise `threshold` to 1.1..1.3 (HDR: only real lights bloom) and lower `strength` to 0.6..0.75; keep `radius` 0.4..0.55.
2. lookConfig brakeLight: `braking` >= 8 (colour value above 1.5, luminance above the bloom threshold, so it blooms only when braking); `idle` <= 1.5 (never blooms).
3. lookConfig mist: lower `opacity` to 0.08..0.14, `riseScale` to 0.1..0.2, `rate` 8..14.
4. src/world/steam.ts: low-lying drift instead of a tall white column. Keep the class API (`new Steam(scene, vents)`, `update(dt, camX, camZ, viewportPx)`) and the pool (max 500, pooled, no allocation per frame; Math.random is fine). Change the emit values and pool options: start y 0.15..0.3, vy at most 0.3 m/s (times LOOK_CONFIG.mist.riseScale), horizontal speed 0.3..0.8 m/s in a random direction, `gravity` 0, life 3..5 s, size growing 0.8 -> 3.0, soft blue-grey colour (about 0.55, 0.6, 0.7), alpha from LOOK_CONFIG.mist.opacity. Keep the 90 m camera range check.
5. Do not edit any file outside Files (the engine, car and weather code already read LOOK_CONFIG).

## Done when
`npm run build` passes and the Check passes (night clipped pixels stay under 2 %), files under 220 lines, only the listed files changed.

## Hand-check (30 s, Carlos)
`npm run dev`, open `/?skip&ai=2`: streetlights glow without a yellow fog over the buildings; hold S and the tail lights flare red, release and they calm down; near a manhole vent a faint mist drifts sideways at ankle height.
