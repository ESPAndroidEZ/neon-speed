# Task 012: DJ Switch radio lines for the new maps
Files: src/data/radio2.ts
Branch: qwen/012-track-radio
Contract (read-only): none. Data only, no imports.

## Write
`export const TRACK_RADIO: Record<string, { start: string[]; idle: string[] }>` with exactly these keys: `neon`, `maze`, `cliff`, `maze-drift`.
Each has 3 `start` lines and 5 `idle` lines. DJ Switch is dry, warm, a little sarcastic, PG, never insults the player.
Placeholders allowed: `{name}` (a rival), `{pos}` and `{n}` (position and field size), `{lap}` and `{laps}`.
- `neon`: downtown boulevards, tram lines in the road, a tunnel, neon signs, rain on glass.
- `maze`: a port yard of stacked containers, nine-metre lanes, ninety-degree corners, cranes, Brick never lifts.
- `cliff`: a point-to-point sprint on the north coast, ocean on one side, crests that launch cars, guard rails, weather off the sea.
- `maze-drift`: a drift night in the yard, no rivals, points for angle and speed, a crowd on the containers.
Also `export const RIVAL_RADIO_2: Record<string, string[]>` with 3 lines each for `Nova` (drift queen, Neon Strip), `Brick` (dock union, never lifts) and `Calloway` (owns the Cliffside, brakes late). Each line contains the rival's name. Every line under 90 characters, no duplicate lines.

## Done when
`npm run build` passes, only `src/data/radio2.ts` changed, the file is under 100 lines.
