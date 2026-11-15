# Task 049: Blender model for the Supra coupe (`supra`)
Files: blender/cars/supra.py
Branch: qwen/049-model-supra
Check: scripts/model-build.sh cars/supra

Read AGENTS.md "3D model tasks", the docstring of blender/lib/rb.py, then copy blender/cars/civic.py to blender/cars/supra.py and change it. Do not edit any other file.

## Exact numbers (from src/data/cars.ts, model-check enforces them)
LENGTH 4.38, WIDTH 1.86, HEIGHT 1.29, WHEELBASE 2.67, WHEEL_R 0.33. Wheels: rb.wheel at x = +/-(WIDTH/2 - 0.13), z = +/-WHEELBASE/2, width 0.22.
Paint colour: rb.mat('paint', color=(0.77, 0.10, 0.17)) BEFORE the body loft.

## Silhouette (game space, rear -> nose; "-" = keep the roof line between its neighbours)
| z | bottom | belt | top | note |
|---|---|---|---|---|
| -2.19 | 0.3 | 0.76 | 0.82 | rear face |
| -2.07 | 0.2 | 0.8 | 0.92 | tail top |
| -1.81 | 0.18 | 0.8 | 0.94 | rear glass base |
| -1.71 | 0.18 | 0.8 | - | rear arch start |
| -1.64 | 0.72 | 0.8 | - |  |
| -1.03 | 0.72 | 0.8 | - |  |
| -0.95 | 0.18 | 0.8 | - |  |
| -0.81 | 0.18 | 0.8 | 1.29 | roof rear edge |
| -0.26 | 0.18 | 0.8 | 1.29 | roof front edge |
| +0.54 | 0.18 | 0.78 | 0.88 | windshield base |
| +0.95 | 0.18 | 0.77 | - | front arch start |
| +1.03 | 0.72 | 0.76 | - |  |
| +1.64 | 0.72 | 0.74 | - |  |
| +1.71 | 0.2 | 0.72 | - |  |
| +2.19 | 0.3 | 0.6 | 0.62 | nose |
Roof half-width about 0.62 under the roof, 0.74 at the windshield base and on the hood and tail. Tune points so the side view looks smooth; keep 6 points per section (use `sec()` from civic.py). Rows marked "-": top = the height you get by interpolating between the nearest rows with a number.

## Character
long low hood, bubble cabin set back, rounded flanks, big rear wing (blade 1.6 x 0.04 x 0.3 at y 1.16 on two posts), four round tail lights (two per side).
Head lights, tail lights, grille and lip like civic.py, moved to this car's nose and tail heights. Glass: `rb.paint_faces` like civic.py with the z range from the rear glass base to the windshield base.

## Done when
`npm run build && scripts/model-build.sh cars/supra` prints MODEL CHECK OK, under 30 000 triangles, only blender/cars/supra.py changed.
