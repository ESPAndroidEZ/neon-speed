# Task 021: 5 building archetypes (set B)
Files: src/world/city/archetypesB.ts
Branch: qwen/021-archetypes-b
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/city/archetypes.ts

## Exact signature
```ts
export const ARCHETYPES_B: Archetype[];
```

## Write
Exactly 5 entries, ids unique. Ideas: `art-deco-hotel` (concrete, 26-48 m, balcony 0.1, billboard roof, ['neon','kestrel']), `noodle-arcade` (brick, 10-16 m, shop true, ac 0.2, roof tank), `radio-block` (concrete, 20-36 m, roof antenna, districts ['*']), `tenement` (brick, 14-26 m, escape 0.12, balcony 0.1), `bank-slab` (glass, 30-60 m, no balcony, roof flat). Same ranges as task 020.

## Validation
`validateArchetypes(ARCHETYPES_B)` returns an empty array.

## Done when
`npm run build` passes, only `src/world/city/archetypesB.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
