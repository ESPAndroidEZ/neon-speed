# Performance

Measured with `npm run bench` (scripts/bench.mjs): headless Chromium with **SwiftShader (software WebGL)**, 844x390 unless
noted, night, 5 AI cars, self-driving, 8 s samples after a 7 s warm-up. SwiftShader runs the GPU work on the CPU, so the
numbers are **relative only** (compare runs on this machine; never read them as phone fps). "4x" = Chromium CPU throttle 4x,
the mobile proxy asked for; it slows JS but not SwiftShader's raster threads, so it is a weak proxy. Frame time counts only
frames that rendered (an fps cap no longer hides cost). Details per run: `logs/bench/*.json`.

Other tools: `scripts/drawcalls.mjs` (calls per scene subtree), `scripts/car-calls.mjs` (calls per car part),
`scripts/fill-cost.mjs` (frame-time cost per top-level object), `scripts/soak.mjs` (long leak run).

## Before / after (2026-11-17)
Before = merge commit a2ac87d, after = this round. ms = mean frame time, calls = median draw calls per frame.

| Tier | Track | Weather | ms before | ms after | calls before | calls after | tris before | tris after |
|---|---|---|---|---|---|---|---|---|
| LOW | city | clear | 59.4 | 36.8 | 223 | 129 | 42k | 39k |
| LOW | city | rain | 88.9 | 67.2 | 235 | 131 | 56k | 53k |
| LOW | city | snow | 83.0 | 57.1 | 224 | 129 | 51k | 48k |
| LOW | mountain | clear | 51.4 | 35.2 | 215 | 191 | 88k | 112k |
| LOW | mountain | rain | 82.3 | 67.2 | 215 | 193 | 101k | 126k |
| LOW | coast | clear | 48.6 | 33.3 | 153 | 233 | 76k | 106k |
| LOW | coast | rain | 79.0 | 69.6 | 381 | 234 | 123k | 120k |
| LOW 4x | city | clear | 67.2 | 42.3 | 226 | 129 | 42k | 39k |
| LOW 4x 390x844 | city | clear | 60.8 | 38.3 | 182 | 127 | 39k | 38k |
| HIGH | city | clear | 228 | 239 | 566 | 424 | 80k | 80k |
| HIGH | city | rain | 342 | 355 | 1143 | 642 | 192k | 170k |
| HIGH | coast | rain | 411 | 363 | 1273 | 736 | 278k | 256k |
| HIGH | mountain | clear | 234 | 237 | 512 | 371 | 121k | 121k |

(Mountain and coast LOW triangle/call counts vary with where the demo car is after 7 s; city is the stable comparison.)
HIGH frame time is flat because SwiftShader is fill-bound at 2x DPR with MSAA 4; the draw-call savings matter on real
phone GPUs (draw-call bound per art-direction), not in software raster.

CPU split (after, city LOW 1x): fixed step (physics + 5 AI + race logic) ~1.6-3 ms per step, frame callbacks (audio,
world, HUD, camera) ~1 ms, render submit ~2 ms. The rest of the frame is raster: GPU-bound everywhere.

Leak check (HIGH, 4 min per track, `LEAK=1`): heap +0.8 to +1.4 MB (ghost/lap recording), geometries step up as parts
first come into view and then stay flat. Track switching 6x (`SWITCH=1`): geometries 536 -> 551, textures 49 -> 49,
programs 46 -> 49 (back to baseline within lazily created parts).

## What changed, and why
1. **GLB cars merged per material** (`world/mergeMeshes` `mergeTreeByMaterial`, byName): each Blender car had 5 meshes
   per wheel plus per-part copies of the same materials: 44 -> 20 draw calls per car (x6 cars). The paint material stays
   the one the tint edits.
2. **Car light glows merged**: four crossed quads per lamp material are one mesh (8 -> 2 calls per car).
3. **Spectator far LOD** (`anim/personBake`): a frozen person (> 40 m) is baked into one vertex-coloured mesh: ~21 -> 1
   call each. Hide range per tier: Low 70 m, Medium 110, High 160, Ultra 200.
4. **Car detail LOD** (`world/carLod`): brake discs, wheel dishes and calipers of procedural cars hide beyond 12/22/32/45 m.
5. **Rain mirror skips people and wheels** (`world/layers` NO_REFLECT, `world/roadMirror`): layer 1 is off for the
   Reflector's pass. (It copies the main camera's layers, so it is switched off around its render.)
6. **Pixel ratio cap fixed**: the Graphics screen overwrote the tier's DPR cap with 2 x resScale (Low rendered at 1.4x).
   Now `min(devicePixelRatio, tier cap) x resScale x dynamic scale` with caps Low 1.0, Medium 1.5, High 2.
7. **Bloom at half resolution** on Low/Medium (bloom is off on Low by default), full on High.
8. **MSAA only on High** (Medium preset 2 -> 0). **Low defaults to 60 fps** (30 is a battery option). **Phones never
   render above 60 fps** even with "display rate".
9. **HUD**: the speed-lines opacity is written only when it changes (no per-frame string or style write).
10. Tried and dropped: `renderer.compileAsync` behind the loading card compiled canvas variants the composer never uses
    (programs 36 -> 76, no gain).

Already in place before this round (checked, kept): fixed 60 Hz step with a 5-substep clamp, dynamic resolution with
hysteresis (10 % steps to 60 %), automatic tier drop with a toast, rain/snow as one instanced draw each with no depth
write and culled drops collapsed off-screen, snapped shadow camera following the car (shadows off by default), blob
shadows under cars, render/audio suspended when the tab is hidden, HUD text only written on change, three.js in its own
long-cached chunk, hashed assets, pre-compressed .gz/.br, service-worker precache, asset budget report.

## Release size (`npm run build:prod`)
Code 408 KB gzip (budget 700), audio 2.6 MB (48 engine WAV loops), models 2.4 MB (7 GLBs), textures 129 KB, total
~5.6 MB (budget 12 MB). Live first load: 0.3-1.3 s to the load event and 1.3 MB transferred including a race start
(engine loops and models stream in later). Release builds only request the GLBs they ship (`core/modelList`).

## Open
- Real-device numbers: the 60 fps on Low target needs a phone (SwiftShader cannot show it).
- Rain/snow on Low cost ~1.8x clear in SwiftShader with the same draw calls: fill (wet road, puddles, streaks). Profile
  on a real GPU before cutting anything.
- Engine loops as WAV: Opus/AAC would cut ~2 MB, but needs a per-browser format check (iOS).
