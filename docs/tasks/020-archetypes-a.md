# Task 020: 5 building archetypes (set A)
Files: src/world/city/archetypesA.ts
Branch: qwen/020-archetypes-a
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/city/archetypes.ts (the `Archetype` interface and the 5 existing entries)

## Exact signature
```ts
export const ARCHETYPES_A: Archetype[];
```

## Write
Exactly 5 entries, ids unique and different from the existing ones. Ideas: `harbor-warehouse` (metal, low 10-18 m, no shop, escape 0, roof flat, districts ['kestrel','maze']), `office-grid` (glass, tall), `row-houses` (brick, 12-20 m, balconies 0.2), `parking-deck` (concrete, ac 0, no shop), `loft-conversion` (brick, 18-30 m, balcony 0.18, roof antenna). Rates 0..1, tint each 0.3..1, weight 1..3, height [min,max] with 8 <= min < max <= 120, districts use '*', 'kestrel', 'neon', 'maze'.

## Validation
`validateArchetypes(ARCHETYPES_A)` from archetypes.ts returns an empty array. Run it in a scratch `tsx -e` once; no test file needed.

## Done when
`npm run build` passes, only `src/world/city/archetypesA.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
