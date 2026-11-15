# Task 054: Blender model for the BMW 535d Touring (E61) estate (`e61`)
Files: blender/cars/e61.py
Branch: qwen/054-model-e61
Check: scripts/model-build.sh cars/e61

FRESH START. Create blender/cars/e61.py by COPYING blender/cars/supra.py (the quality bar: the owner loves it) and changing
only the numbers, the silhouette rows and the details below. Read AGENTS.md "3D model tasks" first. Edit no other file.

## Exact numbers (src/data/cars.ts; model-check enforces them)
LENGTH 4.84, WIDTH 1.85, HEIGHT 1.49, WHEELBASE 2.89, WHEEL_R 0.33, TYRE_W 0.24. TRACK = W - TYRE_W / 2 - 0.01.
rb.mat('paint', color=(0.17, 0.18, 0.21)) before the loft.

## Silhouette (z positions, rear -> nose; use supra.py's sec() helper)
- tail: z -2.42 (bottom 0.32, belt 0.86, top 0.90), z -2.34 (top 1.02)
- rear glass base: z -2.28 (top 1.06)
- roof rear edge z -1.93, roof front edge z +0.07 (top 1.49)
- windshield base z +0.97 (top 0.96)
- nose: z +2.36 (top 0.77), z +2.42 (bottom 0.30, top 0.70)
belt line about 0.9; sills low (0.18) all along; NO arch rows (rb.cut_arches makes the arches).

## Character
long estate: long hood, LONG flat roof running right to the tail, near-vertical tailgate (rearWindowRun 0.35); roof rails (two thin trim boxes 0.04 x 0.04 x 1.6 on the roof at x +/-0.55). Twin round headlights per side (two rb.lamp w 0.16 h 0.14 at x W-0.24 and W-0.42, y 0.68), twin kidney grille (two trim boxes 0.16 x 0.14 at x +/-0.10), slim tail lights wrapping onto the tailgate (w 0.36 h 0.10 at x W-0.20, y 0.96, front=False).
Every light, grille and spoiler goes ON the body with rb.lamp / rb.surface_z / rb.surface_x, never at a guessed z.

## Done when
`npm run build && scripts/model-build.sh cars/e61` prints MODEL CHECK OK. Only blender/cars/e61.py changed.
