# Task 041: Parts catalog for the new parts
Files: src/data/partsCatalogMore.ts
Branch: qwen/041-parts-catalog
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/data/partsCatalog.ts (`CatalogPart`, `partPrice`, `SLOT_BASE`, `CATALOG`)

## Exact signature
```ts
import { partPrice, type CatalogPart } from './partsCatalog';
export const CATALOG_MORE: CatalogPart[];
```

## Write
One entry per part id: spoilers `ducktail lip-slim twin-blade swan-neck roof-fin big-wing`; splitters `lip-wide dual-fin canard plow mesh`; skirts `sharp ducted ribbed carbon`; hoods `scoop twin-vent louvered carbon-flat` (19 entries). `name` a short marketing name, `brand` one of these FICTIONAL makers: Voltaic, Kestrel Aero, Orbit, Halden, Nimbus, Argo, Tekton. `tier` 1 for plain parts, 2 for most, 3 for `big-wing`, `carbon`, `carbon-flat`, `mesh`. `price` MUST be `partPrice(slot, tier)`. Aero parts (spoilers, splitters, `canard`, `dual-fin`) get `mul` with gripRear (spoilers) or gripFront (splitters) between 1.003 and 1.012 and dragCoef between 1.005 and 1.04, bigger tier = bigger numbers; skirts and hoods have no `mul` (hoods `scoop`/`twin-vent` may have dragCoef 1.01).

## Validation
A scratch script checks 19 entries, unique `slot:id`, price equals `partPrice`, `mul` values inside the ranges.

## Done when
`npm run build` passes, only `src/data/partsCatalogMore.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
