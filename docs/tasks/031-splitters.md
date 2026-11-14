# Task 031: 5 splitter designs
Files: src/world/partsSplitters.ts
Branch: qwen/031-splitters
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/carParts.ts (`PartBuilder`, `PartAnchors`, the reference `PARTS.splitter`)

## Exact signature
```ts
import type { PartBuilder } from './carParts';
export const SPLITTER_MORE: Record<string, PartBuilder>;
```

## Write
5 builders with keys `lip-wide`, `dual-fin`, `canard`, `plow`, `mesh`. Front splitters under the nose (z near length/2): wide lip, two end fins, canards on the corners, a snow-plow wedge, a mesh grille bar. Each is `(a, paint, trim) => Object3D` placed in car space from the anchors only (nose +Z, +X left, ground y 0): never hard-code a car size. Primitives only, 6-14 lines each, `paint` for body-coloured pieces, `trim` for dark pieces.

## Validation
A scratch script builds each part for anchors `{length:4.25,width:1.72,height:1.4,belt:0.84,wheelbase:2.62}` and `{length:4.6,width:1.9,height:1.5,belt:0.9,wheelbase:2.8}` and checks the bounding box is finite, width <= anchors.width*1.1, depth <= length, min y >= -0.01.

## Done when
`npm run build` passes, only `src/world/partsSplitters.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
