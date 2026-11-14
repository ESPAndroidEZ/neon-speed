# Task 017: procedural yard props (Container Maze)
Files: src/world/propYard.ts
Branch: qwen/017-prop-yard
Contract (read-only): none. Allowed imports: `three`.

## Write
```ts
export function buildBarrel(): Group;       // 0.9 m tall oil drum, origin at ground
export function buildPallet(): Group;       // 1.2 x 0.15 x 1.0 m wooden pallet with a stack of 3 boxes
export function buildForklift(): Group;     // about 2.4 m long, facing +Z
export function buildFloodlight(): Group;   // 9 m mast with a lamp head, origin at the base
```
Primitives only. Barrel: cylinder 0xc77b1a with two thin darker rings. Pallet: 5 slats (box) + 3 runners, boxes 0x8a6a3a. Forklift: yellow body 0xe0b020, black mast and forks, a cab frame, two big wheels. Floodlight: thin grey mast, a box lamp head with an emissive `MeshBasicMaterial` (white multiplied by 3). Share materials inside each function. No Math.random.

## Done when
`npm run build` passes, only `src/world/propYard.ts` changed, under 110 lines.
