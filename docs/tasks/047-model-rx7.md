# Task 047: Blender model for the RX-7 (FD) coupe (`rx7`)
Files: blender/cars/rx7.py
Branch: qwen/047-model-rx7
Check: scripts/model-build.sh cars/rx7

Read AGENTS.md "3D model tasks", the docstring of blender/lib/rb.py, then copy blender/cars/civic.py to blender/cars/rx7.py and change it. Do not edit any other file.

## Exact numbers (from src/data/cars.ts, model-check enforces them)
LENGTH 4.28, WIDTH 1.77, HEIGHT 1.23, WHEELBASE 2.43, WHEEL_R 0.31. Wheels: rb.wheel at x = +/-(WIDTH/2 - 0.13), z = +/-WHEELBASE/2, width 0.22.
Paint colour: rb.mat('paint', color=(0.95, 0.76, 0.0)) BEFORE the body loft.

## Silhouette (game space, rear -> nose; "-" = keep the roof line between its neighbours)
| z | bottom | belt | top | note |
|---|---|---|---|---|
| -2.14 | 0.3 | 0.74 | 0.8 | rear face |
| -2.02 | 0.2 | 0.78 | 0.9 | tail top |
| -1.76 | 0.18 | 0.78 | 0.92 | rear glass base |
| -1.60 | 0.18 | 0.78 | - | rear arch start |
| -1.52 | 0.68 | 0.78 | - |  |
| -0.92 | 0.68 | 0.78 | - |  |
| -0.84 | 0.18 | 0.78 | - |  |
| -0.71 | 0.18 | 0.78 | 1.23 | roof rear edge |
| -0.21 | 0.18 | 0.78 | 1.23 | roof front edge |
| +0.64 | 0.18 | 0.76 | 0.86 | windshield base |
| +0.84 | 0.18 | 0.75 | - | front arch start |
| +0.92 | 0.68 | 0.74 | - |  |
| +1.52 | 0.68 | 0.72 | - |  |
| +1.60 | 0.2 | 0.7 | - |  |
| +2.14 | 0.3 | 0.58 | 0.6 | nose |
Roof half-width about 0.62 under the roof, 0.74 at the windshield base and on the hood and tail. Tune points so the side view looks smooth; keep 6 points per section (use `sec()` from civic.py). Rows marked "-": top = the height you get by interpolating between the nearest rows with a number.

## Character
very low pointed nose (nose top 0.55, bottom 0.28), curvy bubble cabin, strong rear haunches (+0.05 half-width at the rear arch), rounded tail with a low hoop spoiler (box 1.3 x 0.04 x 0.12 on two small posts).
Head lights, tail lights, grille and lip like civic.py, moved to this car's nose and tail heights. Glass: `rb.paint_faces` like civic.py with the z range from the rear glass base to the windshield base.

## Done when
`npm run build && scripts/model-build.sh cars/rx7` prints MODEL CHECK OK, under 30 000 triangles, only blender/cars/rx7.py changed.
