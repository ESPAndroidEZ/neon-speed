# Task 026: 7 more signs and billboards (set B)
Files: src/world/city/signsB.ts
Branch: qwen/026-signs-b
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/city/signs.ts

## Exact signature
```ts
import type { SignSpec } from './signs';
export const SIGNS_B: SignSpec[];
```

## Write
Exactly 7 entries, FICTIONAL brands (cars, drinks, banks, airlines, game studios: invent them, for example `VOLTA MOTORS`, `FIZZ-O`, `ORBIT BANK`, `SKYLARK AIR`, `PIXEL FORGE`, `NIMBUS TELECOM`, `RUSH ENERGY`). Same field rules as task 025; use `solid` for four of them (billboards).

## Validation
Every entry valid and unique; none of the names is a real company.

## Done when
`npm run build` passes, only `src/world/city/signsB.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
