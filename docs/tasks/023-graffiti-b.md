# Task 023: 4 graffiti and mural painters (B)
Files: src/world/city/graffitiB.ts
Branch: qwen/023-graffiti-b
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/city/graffiti.ts (the `GraffitiPainter` type and the `tag-wave` reference)

## Exact signature
```ts
import type { GraffitiPainter } from './graffiti';
export const GRAFFITI_B: Record<string, GraffitiPainter>;
```

## Write
Four painters with these keys: `wildstyle`, `skull-crown`, `wave-mural`, `crew-tag`. Wildstyle is interlocking angular strokes; skull-crown a simple skull with a crown; wave-mural layered sine waves in two colours; crew-tag a bold tag inside a rounded box. Each is one function `(g, w, h, rnd) => void` of 8-16 lines on a transparent canvas: canvas paths and fills only, neon colours (`#ff2a9d #18d8ff #ffb347 #7a5cff #39ff88 #ffffff`), a dark outline `#06070c`, `shadowBlur` glow. Use only `rnd()` for randomness, never `Math.random`. No text that could be a real brand.

## Validation
In a scratch script with a fake context (a Proxy that records calls), each painter runs without throwing and draws at least 5 calls.

## Done when
`npm run build` passes, only `src/world/city/graffitiB.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
