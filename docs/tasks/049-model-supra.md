# Task 049: Blender model for the Supra coupe (`supra`)
Files: blender/cars/supra.py
Branch: qwen/049-model-supra
Check: scripts/model-build.sh cars/supra

Create blender/cars/supra.py.
Read AGENTS.md "3D model tasks" and the docstring + recipe at the top of blender/cars/civic.py, then copy civic.py and change it.
Keep civic.py's recipe order: loft (NO arch rows, sills low all along) -> paint_faces glass -> rb.cut_arches -> rb.smooth -> details with rb.lamp / rb.surface_z / rb.surface_x -> wheels at TRACK.
Never place a light, grille, wing or mirror by guessing a z: always get it from rb.lamp / rb.surface_z / rb.surface_x so it sits ON the body.

## Exact numbers (src/data/cars.ts, model-check enforces them)
LENGTH 4.38, WIDTH 1.86, HEIGHT 1.29, WHEELBASE 2.67, WHEEL_R 0.33, TYRE_W 0.22. TRACK = W - TYRE_W / 2 - 0.01.
rb.mat('paint', color=(0.77, 0.1, 0.17)) before the loft.

## Silhouette: sec(z, bottom, belt, top, roof_w, w=..., shoulder=...) rows, rear -> nose
| z | bottom | belt | top | roof_w | w | note |
|---|---|---|---|---|---|---|
| -2.19 | 0.32 | 0.76 | 0.8 | 0.62 | w=W-0.10 | rear face |
| -2.11 | 0.22 | 0.8 | 0.92 | 0.62 | w=W-0.03 | tail lights |
| -1.81 | 0.18 | 0.8 | 0.96 | 0.62 |  | rear glass base / boot |
| -0.81 | 0.18 | 0.8 | 1.29 | 0.6 |  | roof rear edge |
| -0.26 | 0.18 | 0.79 | 1.29 | 0.6 |  | roof front edge |
| +0.54 | 0.18 | 0.77 | 0.86 | 0.72 |  | windshield base |
| +1.94 | 0.2 | 0.72 | 0.76 | 0.68 | w=W-0.02 |  |
| +2.13 | 0.24 | 0.65 | 0.67 | 0.6 | w=W-0.08 |  |
| +2.19 | 0.3 | 0.58 | 0.6 | 0.5 | w=W-0.16 | nose |
Add 1-2 rows of your own only if the side view needs them; same 7-point sec() everywhere.

## Character
long low hood, bubble cabin set back, rounded flanks (shoulder 0.03 all along); big rear wing: blade 1.6 x 0.04 x 0.3 at y 1.16 on two posts ON the boot lid; four round tail lights (two rb.lamp per side, w 0.14 h 0.14, at x W-0.22 and W-0.40); narrow headlights (w 0.40 h 0.10 at y 0.66); wide lower intake (trim box placed with rb.surface_z).

## Done when
`npm run build && scripts/model-build.sh cars/supra` prints MODEL CHECK OK, only blender/cars/supra.py changed.
