# Task 042: Dyno graph renderer (polished)
Files: src/ui/dynoGraph2.ts
Branch: qwen/042-dyno-graph
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/ui/dynoGraph.ts (`drawDyno`) and src/physics/dyno.ts (`DynoCurve`)

## Exact signature
```ts
import type { DynoCurve } from '../physics/dyno';
export function drawDyno2(c: HTMLCanvasElement, curve: DynoCurve, stock?: DynoCurve, hoverRpm?: number): void;
```

## Write
Rewrite the chart: smooth curves (quadratic midpoints between samples), a soft gradient fill under power (magenta at 15% alpha) and torque (cyan at 12%), grid lines every 1000 rpm, axis labels with units (`Nm`, `hp`, `rpm`), the stock curve dashed, peak markers as small circles with labels that do not leave the canvas, and when `hoverRpm` is given a vertical cursor line with the interpolated torque and power values in a small box. Use the colours in docs/ui-style.md (`#18d8ff`, `#ff2a9d`, text `#e8f6ffb3`). Under 100 lines, no allocation per sample beyond the path.

## Validation
A scratch script with a recording fake 2d context draws without throwing for a 36-point curve, with and without `stock` and `hoverRpm`.

## Done when
`npm run build` passes, only `src/ui/dynoGraph2.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
