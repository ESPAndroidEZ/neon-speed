# Task 055: Blender model for the BMW M3 (E46) coupe (`m3`)
Files: blender/cars/m3.py
Branch: qwen/055-model-m3
Check: scripts/model-build.sh cars/m3

FRESH START. Create blender/cars/m3.py by COPYING blender/cars/supra.py (the quality bar: the owner loves it) and changing
only the numbers, the silhouette rows and the details below. Read AGENTS.md "3D model tasks" first. Edit no other file.

## Exact numbers (src/data/cars.ts; model-check enforces them)
LENGTH 4.49, WIDTH 1.78, HEIGHT 1.37, WHEELBASE 2.73, WHEEL_R 0.32, TYRE_W 0.24. TRACK = W - TYRE_W / 2 - 0.01.
rb.mat('paint', color=(0.43, 0.54, 0.65)) before the loft.

## Silhouette (z positions, rear -> nose; use supra.py's sec() helper)
- tail: z -2.25 (bottom 0.32, belt 0.80, top 0.84), z -2.17 (top 0.96)
- rear glass base: z -1.70 (top 1.00)
- roof rear edge z -1.00, roof front edge z -0.05 (top 1.37)
- windshield base z +0.80 (top 0.90)
- nose: z +2.19 (top 0.71), z +2.25 (bottom 0.30, top 0.64)
belt line about 0.84; sills low (0.18) all along; NO arch rows (rb.cut_arches makes the arches).

## Character
muscular 2-door coupe: long hood, cabin set back, short boot; wide flared arches (shoulder 0.04 front and rear), power dome on the hood (a PAINT box 0.5 x 0.03 x 0.9 centred on the hood, height from rb.surface_z). Twin round headlights per side (two rb.lamp w 0.16 h 0.13 at x W-0.22 and W-0.40, y 0.66), twin kidney grille (two trim boxes 0.15 x 0.13 at x +/-0.09), L-shaped tail lights (rb.lamp w 0.34 h 0.12 at x W-0.20, y 0.86, front=False), small boot-lid lip spoiler, four round exhaust tips (chrome cylinders r 0.04) under the rear.
Every light, grille and spoiler goes ON the body with rb.lamp / rb.surface_z / rb.surface_x, never at a guessed z.

## Done when
`npm run build && scripts/model-build.sh cars/m3` prints MODEL CHECK OK. Only blender/cars/m3.py changed.
