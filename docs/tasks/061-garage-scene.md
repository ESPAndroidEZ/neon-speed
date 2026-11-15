# Task 061: Underground garage shell for the Garage and Main Menu (no more black void)
Files: src/world/stage.ts src/world/stageShell.ts src/ui/garageConfig.ts
Check: npx tsx tests/graphics-check.mts && npx tsx tests/people-check.mts
Branch: qwen/061-garage-scene
Contract (read-only): `STAGE` ({x, z}) and `buildStage(env: Texture): Group` in src/world/stage.ts keep their names and signatures (src/game/game.ts imports them). GARAGE_CONFIG in src/ui/garageConfig.ts: read its header, you may change numbers only.

## Why
The showroom is a glossy dark disc with two neon rings in an empty black void. It should look like an underground parking garage, with the car and crew framed in the right two thirds of the screen.

## Behaviour
1. stageShell.ts: `buildShell(): Group` centred on (0,0) (stage.ts moves it to STAGE). Concrete floor 40 x 40 m (dark grey, roughness 0.55, metalness 0.1, a faint painted bay line pattern in a small CanvasTexture), ceiling at y = 4.2 m, concrete pillars 0.9 x 0.9 m every 8 m in a ring at 14..16 m radius (about 10 pillars), grey back wall ring or four walls at 18 m, ceiling trusses (thin BoxGeometry beams every 4 m), overhead softbox light strips: 4 emissive panels (about 3 x 0.4 m, colour cool white, emissive <= 1.3 so bloom stays calm) above and around the car, plus a faint magenta/cyan strip along the wall base.
2. Subtle floor reflection WITHOUT real-time reflection: a second plane 1 cm above the floor using the `env` texture as envMap with roughness 0.25 and `transparent` opacity 0.5. No Reflector, no render targets.
3. Instance repeated parts (pillars, beams, panels) with InstancedMesh; shared materials; total under 25 draw calls; under 6 000 triangles.
4. Lights: keep the existing key/rim lights from stage.ts or re-create them (at most 2 PointLights + 1 SpotLight on the car); the car must stay lit like today (check by eye is impossible for you: do not change light intensities from the current values).
5. stage.ts: `buildStage(env)` = the shell + the existing neon rings (keep them, lower to 60 % opacity) minus the old vertical light bars. Remove nothing the game imports.
6. garageConfig.ts: set `side.x` so the car and crew sit unobstructed in the right two thirds (0.33..0.40), `menu.x` 0.3..0.38 (main menu buttons are on the left third), `sheet.y` so the car sits above the bottom sheet on phones (0.2..0.35, positive = up), and `distance` 8.5..10. Change only numbers.

## Done when
`npm run build` and the Check pass, files under 220 lines, only listed files changed.

## Hand-check (30 s, Carlos)
`npm run dev`, open Garage: concrete pillars, ceiling beams and bright light strips around the car; car and the two crew figures right of the panel, not covered by it; resize to a phone shape: car above the sheet; Main Menu: car on the right.
