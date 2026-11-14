# Task 006: procedural street props
Files: src/world/props/streetLamp.ts src/world/props/kiosk.ts src/world/props/neonSign.ts src/world/props/trafficCone.ts src/world/props/bollard.ts src/world/props/bench.ts src/world/props/trashBin.ts
Branch: qwen/006-props
Contract (read-only): none. Imports only from `three` (and `three/addons/*` if needed).

## Export exactly (one function per file, each returns a `Group` with its origin on the ground at the centre, +Z = front)
```ts
export function createStreetLamp(): Group;                       // streetLamp.ts, 6.5 m tall post, curved arm, lamp head facing down, emissive warm lens
export function createKiosk(): Group;                            // kiosk.ts, 2.8 m tall newsstand about 2.2 x 1.6 m, shutter, awning, emissive window
export function createNeonSign(text: string, color: number): Group; // neonSign.ts, board 3 x 0.9 m, canvas text texture, emissive glow
export function createTrafficCone(): Group;                      // trafficCone.ts, 0.7 m, orange with a white band
export function createBollard(): Group;                          // bollard.ts, 0.9 m steel post with a reflective band
export function createBench(): Group;                            // bench.ts, 1.8 m, slatted seat and back, metal legs
export function createTrashBin(): Group;                         // trashBin.ts, 0.9 m cylinder with a lid
```

## Behaviour
- Low poly (under 400 triangles each, the neon sign board is a box). Geometries and materials are created ONCE at module level (lazily on first call) and shared by every returned Group, so a thousand props cost a few draw calls. `createNeonSign` caches one material per (text, color) pair in a `Map`.
- Use `MeshStandardMaterial`; emissive parts use `emissive` with `emissiveIntensity` 2 to 3 (the scene has bloom). Set `castShadow = true` on meshes.
- Each file is under 150 lines and imports nothing from the project. No `any`, no enums, no constructor parameter properties.
- No allocation inside the exported functions beyond the Group and Mesh objects.

## Done when
`npm run build` passes, each file under 150 lines, only the listed files changed.
