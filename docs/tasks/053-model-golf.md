# Task 053: Blender model for the VW Golf IV GTI hatchback (`golf`)
Files: blender/cars/golf.py
Branch: qwen/053-model-golf
Check: scripts/model-build.sh cars/golf

FRESH START. Create blender/cars/golf.py by COPYING blender/cars/supra.py (the quality bar: the owner loves it) and changing
only the numbers, the silhouette rows and the details below. Read AGENTS.md "3D model tasks" first. Edit no other file.

## Exact numbers (src/data/cars.ts; model-check enforces them)
LENGTH 4.15, WIDTH 1.73, HEIGHT 1.44, WHEELBASE 2.51, WHEEL_R 0.3, TYRE_W 0.2. TRACK = W - TYRE_W / 2 - 0.01.
rb.mat('paint', color=(0.11, 0.16, 0.27)) before the loft.

## Silhouette (z positions, rear -> nose; use supra.py's sec() helper)
- tail: z -2.08 (bottom 0.32, belt 0.84, top 0.88), z -2.00 (top 1.00)
- rear glass base: z -1.72 (top 1.04)
- roof rear edge z -1.27, roof front edge z +0.23 (top 1.44)
- windshield base z +1.08 (top 0.94)
- nose: z +2.02 (top 0.75), z +2.08 (bottom 0.30, top 0.68)
belt line about 0.88; sills low (0.18) all along; NO arch rows (rb.cut_arches makes the arches).

## Character
compact 3-door hatch: short hood, tall upright cabin, near-vertical hatch glass, roof ends at the tail. Round-cornered rectangular headlights (rb.lamp w 0.30 h 0.12 at x W-0.30, y 0.66), small dark grille strip between them, wide wrap-round tail lights (w 0.30 h 0.16 at x W-0.20, y 0.92, front=False), small roof spoiler over the hatch.
Every light, grille and spoiler goes ON the body with rb.lamp / rb.surface_z / rb.surface_x, never at a guessed z.

## Done when
`npm run build && scripts/model-build.sh cars/golf` prints MODEL CHECK OK. Only blender/cars/golf.py changed.
