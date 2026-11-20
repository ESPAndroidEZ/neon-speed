# Task 067: Traffic vehicle shapes for Neon Harbor (hatch, van, taxi, pickup)
Files: src/world/open/trafficShapes.ts tests/traffic-shapes-check.mts
Check: npx tsx tests/traffic-shapes-check.mts
Branch: qwen/067-traffic-variants
Contract (read-only): `carShapes()` in src/world/open/trafficView.ts is the reference (body = merged boxes; lamps = quads with a vertex `color` attribute, white front at +z, red rear at -z)

## Why
All 40 traffic cars are the same saloon. Claude will choose per variant at wiring time (draw-call budget is tight: ~217 of 250 on LOW).

## Export exactly
import type { BufferGeometry } from 'three';
export const TRAFFIC_VARIANTS = ['saloon', 'hatch', 'van', 'taxi', 'pickup'] as const;
export function trafficShape(kind: (typeof TRAFFIC_VARIANTS)[number]): { body: BufferGeometry; lamps: BufferGeometry; length: number; width: number };

## Behaviour
1. Car space: +Z nose, +X left, y up, wheels on y = 0, centred on 0,0. Use BoxGeometry/CylinderGeometry + mergeGeometries (three/examples/jsm/utils/BufferGeometryUtils.js), as in carShapes.
2. Sizes (length x width x height m): saloon = copy carShapes (4.4 x 1.8 x 1.42); hatch 3.9 x 1.75 x 1.5 (short rear); van 5.0 x 2.0 x 2.2 (one tall box, short nose 0.9 m lower); taxi = saloon + roof sign box 0.8 x 0.25 x 0.3 on the cabin (its colour goes in `lamps` as warm yellow 1.5, 1.2, 0.3 so it glows); pickup 5.2 x 1.9 x 1.7 (cab front half, open bed: four thin walls 0.5 m high).
3. Four dark wheels as part of `body` (cylinders r 0.33, w 0.25, 8 segments) at +-(width/2 - 0.1), z = +-(length/2 - 0.8).
4. lamps: front white (1.4, 1.35, 1.2) and rear red (1.6, 0.08, 0.08) quads like carShapes, on each variant's own front/back face.
5. Triangle budget: body <= 260 triangles, lamps <= 12 triangles per variant.

## Test (tests/traffic-shapes-check.mts)
For each variant: bounding box matches length/width within 0.15 m and min y >= -0.01; lamps have a `color` attribute; triangle budgets hold; front lamps at z > 0, rear at z < 0.

## Done when
npm run build passes, the Check passes, files under 220 lines, only listed files changed.
