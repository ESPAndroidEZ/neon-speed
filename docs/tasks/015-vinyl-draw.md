# Task 015: vinyl pattern painters
Files: src/world/vinylDraw.ts
Branch: qwen/015-vinyl-draw
Contract (read-only): none. No imports except `import type`.

## Write
```ts
export type VinylKind = 'stripes' | 'racing' | 'flames' | 'checker' | 'diamonds' | 'splash';
export const VINYLS: readonly VinylKind[];
export function drawVinyl(g: CanvasRenderingContext2D, kind: VinylKind, size: number, color: string, accent: string): void;
```
`drawVinyl` paints a transparent-background pattern into a `size` x `size` square (clearRect first, then fills with `color` and `accent`). It must tile nicely: stripes = two bold vertical bands at 40% and 60%; racing = one wide band with two thin edge lines; flames = 4 curved flame tongues rising from the bottom edge (quadratic curves); checker = 8x8 checker in the top third only; diamonds = a repeating 4x4 grid of diamonds; splash = 12 deterministic circles of varied radius (use a tiny LCG seeded by `size`, never Math.random). One small private helper per kind, each under 20 lines. No allocation loops beyond the pattern itself.

## Done when
`npm run build` passes, only `src/world/vinylDraw.ts` changed, under 100 lines.
