# Task 016: procedural tram stop and bus shelter (Neon Strip)
Files: src/world/propTram.ts
Branch: qwen/016-prop-tram
Contract (read-only): none. Allowed imports: `three`.

## Write
```ts
export function buildTramStop(): Group;     // about 8 m long, facing +Z, origin at ground level centre
export function buildShelter(): Group;      // bus shelter 3 m wide
```
Plain boxes and cylinders only (`BoxGeometry`, `CylinderGeometry`), `MeshStandardMaterial` for the frame (dark grey 0x2b2f38, metalness 0.6) and glass (0x1a3a4a, transparent, opacity 0.35), `MeshBasicMaterial` for an emissive sign strip along the roof edge (cyan 0x18d8ff multiplied by 3 with `new Color(...).multiplyScalar(3)`) and a magenta (0xff2a9d) strip on the shelter. The tram stop: a raised platform 0.25 m high, 8 x 2 m, a roof on four posts 3 m high, a sign box on top. The shelter: back and side glass panels, a roof slab, a bench. Every mesh shares geometries per function call where it is natural, no per-frame code, no allocation outside the builders.

## Done when
`npm run build` passes, only `src/world/propTram.ts` changed, under 110 lines.
