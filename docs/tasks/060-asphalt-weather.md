# Task 060: Asphalt variation and wet puddles in RAIN and SNOW
Files: src/world/roadMaterial.ts src/world/worldLook.ts src/world/trackMesh.ts
Check: scripts/with-dev.sh 'node scripts/nitro-check.mjs --base $BASE' && npx tsx tests/graphics-check.mts
Branch: qwen/060-asphalt-weather
Contract (read-only): WeatherProfile in src/types/game.ts (`name`: CLEAR | RAIN | SNOW, `roadRoughness`, `precipitation`); LOOK_CONFIG.road in src/render/lookConfig.ts (read only, do not edit it: task 058 owns it)

## Why
The road is a flat matte material with one baked texture (trackMesh.ts `roadMat`, textures.ts `makeRoadTexture`). It needs cheap procedural variation and, in bad weather, wet specular puddles.

## Behaviour
1. roadMaterial.ts: `export function patchRoad(mat: MeshStandardMaterial): { setWeather(wet: number, snow: number): void }`. Use `mat.onBeforeCompile` to add: a tiled noise `DataTexture` (256x256, RG, generated once on the CPU with a seeded value-noise, RepeatWrapping), sampled at world XZ (a varying `vWorldXZ`) at two scales (about 0.08 and 0.5 per metre). Dry look: roughness varied +/-0.12 and a faint normal perturbation (bump from the noise gradient, strength 0.15) so tyre-polished and rough patches show. Cheap: 2 texture reads, no loops, mediump-safe.
2. Puddles: a mask from the low-frequency noise (threshold so about 18 % of the road is puddle when `wet` = 1): inside puddles roughness 0.04, normal flat, so the env reflection mirrors neon. `wet` fades in with the weather ramp (uniform, no recompile). RAIN: wet = 1, puddle colour about 0.7x darker is allowed. SNOW: puddles are slush: wet = 0.6, roughness only, NO darkening and no colour change (snow road mean brightness must stay within 3 % of today).
3. worldLook.ts: after the existing material lines, call the patch's `setWeather(p.name === 'RAIN' ? 1 : p.name === 'SNOW' ? 0.6 : 0, p.name === 'SNOW' ? 1 : 0)`. trackMesh.ts: call `patchRoad(roadMat)` once and return the handle in the result object (add a field `road`). Keep all existing LOOK_CONFIG.road reads.
4. Uniform updates only; nothing allocates per frame; no new packages.

## Done when
`npm run build` and the Check pass (night clipped pixels under 2 %), files under 220 lines, only listed files changed. Informational: `scripts/with-dev.sh 'node scripts/visual-check.mjs --base $BASE'` (it is flaky on main: neon-clear / snow-speed can fail on their own; do not chase those).

## Hand-check (30 s, Carlos)
`npm run dev`, `/?skip&ai=2&w=rain`: road shows mirror-like puddles reflecting neon and subtle patchiness; `&w=snow`: same patches but no darker road; `&w=clear`: only subtle roughness variation.
