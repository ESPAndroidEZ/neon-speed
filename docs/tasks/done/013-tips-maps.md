# Task 013: loading-screen tips for the new maps
Files: src/data/tips2.ts
Branch: qwen/013-tips-maps
Contract (read-only): none. Data only, no imports.

## Write
`export const TIPS_2: string[]` with exactly 18 tips, each under 110 characters, three groups of six:
1. Neon Strip (wide boulevards, tram rails across the road: brake before them, cross them straight, a long tunnel with echo, rain).
2. Container Maze (nine-metre lanes, ninety-degree corners, brake first, a straight under the cranes, snow banks, Brick will not move over, drift night between the stacks).
3. Cliffside Run (point-to-point, crests: lift before them, guard rails, ocean on the left, weather rolls in from the sea at about 35 s, climbs and descents change how the car brakes).
Plain advice, second person, no jokes at the player's expense, PG. No duplicate lines.

## Done when
`npm run build` passes, only `src/data/tips2.ts` changed.
