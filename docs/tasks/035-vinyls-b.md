# Task 035: 10 vinyl painters (B)
Files: src/world/vinylB.ts
Branch: qwen/035-vinyls-b
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/vinylLayer.ts (`VinylPainter`, `stripes`, `racing`, `checker`)

## Exact signature
```ts
import type { VinylPainter } from './vinylLayer';
export const VINYLS_B: Record<string, VinylPainter>;
```

## Write
Ten painters with keys `tiger`, `wave`, `shards`, `scales`, `circuit`, `speed-lines`, `cross-hatch`, `stars`, `zigzag`, `halftone`. Each `(g, size, color) => void` paints ONE pattern in `color` onto a transparent `size` x `size` square (no fillRect of the whole canvas, the paint shows through), 4-12 lines. Deterministic: no Math.random, derive positions from `size`. Patterns should tile sensibly on a car body.

## Validation
A scratch script with a recording fake context runs each painter at size 512 without throwing and makes at least 2 draw calls.

## Done when
`npm run build` passes, only `src/world/vinylB.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
