# Task 024: 4 graffiti and mural painters (C)
Files: src/world/city/graffitiC.ts
Branch: qwen/024-graffiti-c
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/city/graffiti.ts (the `GraffitiPainter` type and the `tag-wave` reference)

## Exact signature
```ts
import type { GraffitiPainter } from './graffiti';
export const GRAFFITI_C: Record<string, GraffitiPainter>;
```

## Write
Four painters with these keys: `city-skyline`, `eye`, `robot`, `flowers`. City-skyline is a row of building silhouettes with lit windows; eye an open eye with lashes; robot a boxy robot head; flowers five simple flowers on stems. Each is one function `(g, w, h, rnd) => void` of 8-16 lines on a transparent canvas: canvas paths and fills only, neon colours (`#ff2a9d #18d8ff #ffb347 #7a5cff #39ff88 #ffffff`), a dark outline `#06070c`, `shadowBlur` glow. Use only `rnd()` for randomness, never `Math.random`. No text that could be a real brand.

## Validation
In a scratch script with a fake context (a Proxy that records calls), each painter runs without throwing and draws at least 5 calls.

## Done when
`npm run build` passes, only `src/world/city/graffitiC.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
