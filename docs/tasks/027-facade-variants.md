# Task 027: 12 facade and road colour variants
Files: src/world/city/facadeVariants.ts
Branch: qwen/027-facade-variants
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/city/textures.ts (`makeFacadeSheet(kind, seed, baseOverride)`)

## Exact signature
```ts
export interface FacadeVariant { id: string; kind: 'brick' | 'concrete' | 'metal' | 'glass'; seed: number; base: string }
export const FACADE_VARIANTS: FacadeVariant[];
export interface RoadVariant { id: string; base: string; grit: number }
export const ROAD_VARIANTS: RoadVariant[];
```

## Write
FACADE_VARIANTS: 12 entries (4 brick: red, brown, yellow, painted white; 4 concrete: grey, warm, cool, stained; 2 metal: blue, rust; 2 glass: teal, bronze), unique ids and seeds 1..99, `base` a `#rrggbb` string. ROAD_VARIANTS: 4 entries (`fresh`, `worn`, `patched`, `wet-dark`), `base` a dark `#rrggbb` (each channel under 0x40), `grit` 0..1.

## Validation
A scratch script checks counts, unique ids, valid hex strings and ranges.

## Done when
`npm run build` passes, only `src/world/city/facadeVariants.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
