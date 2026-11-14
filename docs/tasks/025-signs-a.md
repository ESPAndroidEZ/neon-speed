# Task 025: 8 more shop signs (set A)
Files: src/world/city/signsA.ts
Branch: qwen/025-signs-a
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/city/signs.ts (the `SignSpec` interface and the 8 `SIGNS`)

## Exact signature
```ts
import type { SignSpec } from './signs';
export const SIGNS_A: SignSpec[];
```

## Write
Exactly 8 entries with FICTIONAL brands that do not exist (invent short names such as `MOCHI MOON`, `TURBO TACOS`, `SIGMA GYM`, `LUMEN PHONES`, `PAPER KITE`, `GHOST VINYL`, `RAMEN 9`, `CORAL SPA`). `text` max 12 characters upper case, `sub` max 18, `color` and `alt` hex strings from `#ff2a9d #18d8ff #ffb347 #7a5cff #39ff88 #ff9a2e #c8f4ff #ffffff`, style one of `tube`, `solid`, `bar`, icon one of `bowl bolt scissors star ring cup`. Mix the styles.

## Validation
Every entry has all required fields and a unique `text`; run a scratch check.

## Done when
`npm run build` passes, only `src/world/city/signsA.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
