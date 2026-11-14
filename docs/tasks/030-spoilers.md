# Task 030: 6 spoiler designs
Files: src/world/partsSpoilers.ts
Branch: qwen/030-spoilers
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/carParts.ts (`PartBuilder`, `PartAnchors`, the reference `PARTS.spoiler`)

## Exact signature
```ts
import type { PartBuilder } from './carParts';
export const SPOILER_MORE: Record<string, PartBuilder>;
```

## Write
6 builders with keys `ducktail`, `lip-slim`, `twin-blade`, `swan-neck`, `roof-fin`, `big-wing`. Rear spoilers: ducktail kick, slim lip, two stacked blades, swan-neck uprights, a roof fin above the rear window (y near belt+0.5), a very large wing. Each is `(a, paint, trim) => Object3D` placed in car space from the anchors only (nose +Z, +X left, ground y 0): never hard-code a car size. Primitives only, 6-14 lines each, `paint` for body-coloured pieces, `trim` for dark pieces.

## Validation
A scratch script builds each part for anchors `{length:4.25,width:1.72,height:1.4,belt:0.84,wheelbase:2.62}` and `{length:4.6,width:1.9,height:1.5,belt:0.9,wheelbase:2.8}` and checks the bounding box is finite, width <= anchors.width*1.1, depth <= length, min y >= -0.01.

## Done when
`npm run build` passes, only `src/world/partsSpoilers.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
