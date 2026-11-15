# Task 048: Blender model for the Lancer Evolution sedan (`evo`)
Files: blender/cars/evo.py
Branch: qwen/048-model-evo
Check: scripts/model-build.sh cars/evo

Create blender/cars/evo.py.
Read AGENTS.md "3D model tasks" and the docstring + recipe at the top of blender/cars/civic.py, then copy civic.py and change it.
Keep civic.py's recipe order: loft (NO arch rows, sills low all along) -> paint_faces glass -> rb.cut_arches -> rb.smooth -> details with rb.lamp / rb.surface_z / rb.surface_x -> wheels at TRACK.
Never place a light, grille, wing or mirror by guessing a z: always get it from rb.lamp / rb.surface_z / rb.surface_x so it sits ON the body.

## Exact numbers (src/data/cars.ts, model-check enforces them)
LENGTH 4.51, WIDTH 1.77, HEIGHT 1.45, WHEELBASE 2.63, WHEEL_R 0.32, TYRE_W 0.22. TRACK = W - TYRE_W / 2 - 0.01.
rb.mat('paint', color=(0.16, 0.31, 0.66)) before the loft.

## Silhouette: sec(z, bottom, belt, top, roof_w, w=..., shoulder=...) rows, rear -> nose
| z | bottom | belt | top | roof_w | w | note |
|---|---|---|---|---|---|---|
| -2.25 | 0.32 | 0.84 | 0.88 | 0.62 | w=W-0.10 | rear face |
| -2.17 | 0.22 | 0.88 | 1.0 | 0.62 | w=W-0.03 | tail lights |
| -1.70 | 0.18 | 0.88 | 1.04 | 0.62 |  | rear glass base / boot |
| -1.15 | 0.18 | 0.88 | 1.45 | 0.6 |  | roof rear edge |
| -0.05 | 0.18 | 0.87 | 1.45 | 0.6 |  | roof front edge |
| +0.85 | 0.18 | 0.85 | 0.94 | 0.72 |  | windshield base |
| +2.00 | 0.2 | 0.8 | 0.84 | 0.68 | w=W-0.02 |  |
| +2.19 | 0.24 | 0.73 | 0.75 | 0.6 | w=W-0.08 |  |
| +2.25 | 0.3 | 0.66 | 0.68 | 0.5 | w=W-0.16 | nose |
Add 1-2 rows of your own only if the side view needs them; same 7-point sec() everywhere.

## Character
upright four-door sedan with a separate boot (the tail section top flat at belt + 0.12); big front bumper with a wide dark intake (trim box 1.1 x 0.18 placed with rb.surface_z) and fog lights; hood scoop (trim box 0.5 x 0.06 x 0.3 on the hood near the windshield base, y from rb.surface heights); large rear wing: blade 1.5 x 0.04 x 0.28 at y 1.18 on two posts standing ON the boot lid; headlights rb.lamp w 0.38 h 0.12; tail lights w 0.34 h 0.12.

## Done when
`npm run build && scripts/model-build.sh cars/evo` prints MODEL CHECK OK, only blender/cars/evo.py changed.
