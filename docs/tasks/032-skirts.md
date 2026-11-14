# Task 032: 4 skirts designs
Files: src/world/partsSkirts.ts
Branch: qwen/032-skirts
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/carParts.ts (`PartBuilder`, `PartAnchors`, the reference `PARTS.skirts`)

## Exact signature
```ts
import type { PartBuilder } from './carParts';
export const SKIRTS_MORE: Record<string, PartBuilder>;
```

## Write
4 builders with keys `sharp`, `ducted`, `ribbed`, `carbon`. Side skirt sets: each returns a Group with both sides (x = +/- (width/2 - 0.04), y about 0.2, length about wheelbase*0.6): sharp edge, with an air duct slot, ribbed fins, a thick carbon sill. Each is `(a, paint, trim) => Object3D` placed in car space from the anchors only (nose +Z, +X left, ground y 0): never hard-code a car size. Primitives only, 6-14 lines each, `paint` for body-coloured pieces, `trim` for dark pieces.

## Validation
A scratch script builds each part for anchors `{length:4.25,width:1.72,height:1.4,belt:0.84,wheelbase:2.62}` and `{length:4.6,width:1.9,height:1.5,belt:0.9,wheelbase:2.8}` and checks the bounding box is finite, width <= anchors.width*1.1, depth <= length, min y >= -0.01.

## Done when
`npm run build` passes, only `src/world/partsSkirts.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
