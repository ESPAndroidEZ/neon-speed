# Task 037: 5 street props (B)
Files: src/world/propsB.ts
Branch: qwen/037-props-traffic
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/world/propsKit.ts (`PropBuilder`, the `trash-can` reference)

## Exact signature
```ts
import type { PropBuilder } from './propsKit';
export const PROPS_B: Record<string, PropBuilder>;
```

## Write
Five builders with keys `traffic-light`, `street-sign`, `barrier`, `cone-stack`, `speed-bump`. Traffic items; the traffic light has red, amber and green emissive discs. Each returns a Group at ground level (y 0 is the floor), facing +Z, 0.5-3 m tall, primitives and 2-4 materials, 8-14 lines, under 80 triangles, no textures. One emissive accent (`MeshStandardMaterial` with `emissive` and `emissiveIntensity` 1.5) per prop where it makes sense.

## Validation
A scratch script builds each prop; the bounding box is finite, min y >= -0.01, max y between 0.5 and 3.2.

## Done when
`npm run build` passes, only `src/world/propsB.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
