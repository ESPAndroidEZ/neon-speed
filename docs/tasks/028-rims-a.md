# Task 028: 6 rim designs (A)
Files: src/world/rimsA.ts
Branch: qwen/028-rims-a
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/rims.ts (`RimBuilder`, `five` and `multi`)

## Exact signature
```ts
import type { RimBuilder } from './rims';
export const RIMS_A: Record<string, RimBuilder>;
```

## Write
Six builders with keys `split-five`, `deep-dish`, `turbine`, `star`, `mesh-fine`, `blade`. Each `(r, face, rim) => Object3D[]` returns the face parts (spokes, lips, bolts, discs) in wheel space like the reference: axle along X, `face` is the X of the outer face, parts within radius 0.7*r. Primitives only (`BoxGeometry`, `CylinderGeometry`, `TorusGeometry`), shared geometry inside one call, 6-12 lines each. Distinct silhouettes: spoke count, twist, dish, lip.

## Validation
A scratch script calls every builder with `(0.32, 0.125, new MeshStandardMaterial())` and checks it returns 1-14 finite objects whose bounding box fits inside radius 0.25.

## Done when
`npm run build` passes, only `src/world/rimsA.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
