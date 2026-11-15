# Task 048: Blender model for the Lancer Evolution sedan (`evo`)
Files: blender/cars/evo.py
Branch: qwen/048-model-evo
Check: scripts/model-build.sh cars/evo

Read AGENTS.md "3D model tasks", the docstring of blender/lib/rb.py, then copy blender/cars/civic.py to blender/cars/evo.py and change it. Do not edit any other file.

## Exact numbers (from src/data/cars.ts, model-check enforces them)
LENGTH 4.51, WIDTH 1.77, HEIGHT 1.45, WHEELBASE 2.63, WHEEL_R 0.32. Wheels: rb.wheel at x = +/-(WIDTH/2 - 0.13), z = +/-WHEELBASE/2, width 0.22.
Paint colour: rb.mat('paint', color=(0.16, 0.31, 0.66)) BEFORE the body loft.

## Silhouette (game space, rear -> nose; "-" = keep the roof line between its neighbours)
| z | bottom | belt | top | note |
|---|---|---|---|---|
| -2.25 | 0.3 | 0.84 | 0.9 | rear face |
| -2.13 | 0.2 | 0.88 | 1.0 | tail top |
| -1.70 | 0.18 | 0.88 | 1.02 | rear glass base |
| -1.69 | 0.18 | 0.88 | - | rear arch start |
| -1.61 | 0.7 | 0.88 | - |  |
| -1.15 | 0.18 | 0.88 | 1.45 | roof rear edge |
| -1.01 | 0.7 | 0.88 | - |  |
| -0.93 | 0.18 | 0.88 | - |  |
| -0.05 | 0.18 | 0.88 | 1.45 | roof front edge |
| +0.85 | 0.18 | 0.86 | 0.96 | windshield base |
| +0.93 | 0.18 | 0.85 | - | front arch start |
| +1.01 | 0.7 | 0.84 | - |  |
| +1.61 | 0.7 | 0.82 | - |  |
| +1.69 | 0.2 | 0.8 | - |  |
| +2.25 | 0.3 | 0.68 | 0.7 | nose |
Roof half-width about 0.62 under the roof, 0.74 at the windshield base and on the hood and tail. Tune points so the side view looks smooth; keep 6 points per section (use `sec()` from civic.py). Rows marked "-": top = the height you get by interpolating between the nearest rows with a number.

## Character
upright four-door sedan with a separate boot (trunk lid flat at belt + 0.12); large rear wing (blade 1.5 x 0.04 x 0.28 at y 1.18 on two posts) over the boot; hood scoop (trim box 0.5 x 0.06 x 0.3 near the windshield base); big front intake.
Head lights, tail lights, grille and lip like civic.py, moved to this car's nose and tail heights. Glass: `rb.paint_faces` like civic.py with the z range from the rear glass base to the windshield base.

## Done when
`npm run build && scripts/model-build.sh cars/evo` prints MODEL CHECK OK, under 30 000 triangles, only blender/cars/evo.py changed.
