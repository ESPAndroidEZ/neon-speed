# Task 051: Rework the RX-7 (FD) coupe (`rx7`)
Status: CANCELLED 2026-11-15 (owner: no more visual work on existing cars). Do not run.
Files: blender/cars/rx7.py
Branch: qwen/051-model-rx7
Check: scripts/model-build.sh cars/rx7

The current blender/cars/rx7.py is the OLD style (fake arch rows, floating lights, rear wheels buried in the body). REWRITE it from the new reference.
Read AGENTS.md "3D model tasks" and the docstring + recipe at the top of blender/cars/civic.py, then copy civic.py and change it.
Keep civic.py's recipe order: loft (NO arch rows, sills low all along) -> paint_faces glass -> rb.cut_arches -> rb.smooth -> details with rb.lamp / rb.surface_z / rb.surface_x -> wheels at TRACK.
Never place a light, grille, wing or mirror by guessing a z: always get it from rb.lamp / rb.surface_z / rb.surface_x so it sits ON the body.

## Exact numbers (src/data/cars.ts, model-check enforces them)
LENGTH 4.28, WIDTH 1.77, HEIGHT 1.23, WHEELBASE 2.43, WHEEL_R 0.31, TYRE_W 0.22. TRACK = W - TYRE_W / 2 - 0.01.
rb.mat('paint', color=(0.95, 0.76, 0.0)) before the loft.

## Silhouette: sec(z, bottom, belt, top, roof_w, w=..., shoulder=...) rows, rear -> nose
| z | bottom | belt | top | roof_w | w | note |
|---|---|---|---|---|---|---|
| -2.14 | 0.32 | 0.74 | 0.78 | 0.62 | w=W-0.10 | rear face |
| -2.06 | 0.22 | 0.78 | 0.9 | 0.62 | w=W-0.03 | tail lights |
| -1.76 | 0.18 | 0.78 | 0.94 | 0.62 |  | rear glass base / boot |
| -0.71 | 0.18 | 0.78 | 1.23 | 0.6 |  | roof rear edge |
| -0.21 | 0.18 | 0.77 | 1.23 | 0.6 |  | roof front edge |
| +0.64 | 0.18 | 0.75 | 0.84 | 0.72 |  | windshield base |
| +1.89 | 0.2 | 0.7 | 0.74 | 0.68 | w=W-0.02 |  |
| +2.08 | 0.24 | 0.63 | 0.65 | 0.6 | w=W-0.08 |  |
| +2.14 | 0.3 | 0.56 | 0.58 | 0.5 | w=W-0.16 | nose |
Add 1-2 rows of your own only if the side view needs them; same 7-point sec() everywhere.

## Character
very low pointed nose (nose section bottom 0.28, top 0.56), curvy bubble cabin, strong rear haunches (shoulder 0.04 from the rear axle back); small oval headlights low on the nose (rb.lamp w 0.26 h 0.08 at y 0.55); thin tail light strip (w 0.5 h 0.07); low hoop spoiler: blade box 1.3 x 0.04 x 0.14 on two post boxes, ON the tail (use rb.surface_z(body, 0, y, front=False)).

## Done when
`npm run build && scripts/model-build.sh cars/rx7` prints MODEL CHECK OK, only blender/cars/rx7.py changed.
