# Task 052: Civic hatchback model to the Supra's standard (`civic`)
Status: CANCELLED 2026-11-15 (owner: no more visual work on existing cars). Do not run.
Files: blender/cars/civic.py
Branch: qwen/052-model-civic
Check: scripts/model-build.sh cars/civic

blender/cars/civic.py is the reference recipe; keep its recipe ORDER and its exact numbers (LENGTH 4.25, WIDTH 1.72,
HEIGHT 1.40, WHEELBASE 2.62, WHEEL_R 0.30, TYRE_W 0.2). Read AGENTS.md "3D model tasks" and blender/cars/supra.py
(the quality bar: owner says it "looks fantastic") and bring the Civic up to that level of detail.

## Change
- Paint white: rb.mat('paint', color=(0.91, 0.91, 0.93)).
- Shoulder 0.02 along the flanks from the rear axle back (the hatch has small haunches).
- Roof spoiler over the hatch glass: trim box 1.2 x 0.04 x 0.22 sitting ON the roof's rear edge (rb.surface_z(body, 0, HEIGHT - 0.04, front=False)).
- Headlights: two rb.lamp per side (main w 0.30 h 0.10 at x W-0.28, indicator 'light_rear' colour is wrong: use material 'chrome' w 0.08 h 0.06 at x W-0.08), y 0.64.
- Tail lights: tall wrap-round lamps rb.lamp w 0.26 h 0.22 at x W-0.16, y 0.92, front=False.
- Lower front intake: trim box 0.9 x 0.12 placed with rb.surface_z(body, 0, 0.32) - 0.02; keep the grille.
- Side skirts: trim boxes 0.04 x 0.06 x (WHEELBASE - 0.75) at x = rb.surface_x(body, 0.24, 0) + 0.01, y 0.24, mirrored.
- Keep every detail ON the body (rb.lamp / rb.surface_z / rb.surface_x). Under 30 000 triangles.

## Done when
`npm run build && scripts/model-build.sh cars/civic` prints MODEL CHECK OK, only blender/cars/civic.py changed.
