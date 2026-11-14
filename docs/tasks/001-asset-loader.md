# Task 001: car model loader
Files: src/world/assetLoader.ts
Branch: qwen/001-asset-loader
Contract (read-only): `CarModel` in src/types/game.ts

## Export exactly
```ts
export function loadCarModel(url: string, opts?: { targetLength?: number; yawOffset?: number }): Promise<CarModel>;
export function disposeCarModel(model: CarModel): void;
```

## Behaviour
- Use `GLTFLoader` from `three/addons/loaders/GLTFLoader.js`. Cache the loaded glTF per URL (a `Map`); each call returns an independent clone (`scene.clone(true)`).
- Generated (Tripo/Meshy) meshes have arbitrary scale, origin and facing. Put the clone in a wrapper `Group` and normalise:
  1. If the X extent is longer than the Z extent, rotate 90 degrees about Y so the long axis lies along Z.
  2. Apply `yawOffset` (radians, default 0) about Y. This is how the owner fixes front/back.
  3. Scale uniformly so the longest horizontal extent equals `targetLength` (default 4.4 metres).
  4. Centre on X and Z. Move the lowest point to y = 0.
- `CarModel.size` = bounding box after normalisation (x width, y height, z length).
- `wheels`: top-level child nodes whose name matches `/wheel|tire|tyre|rim/i`. Often none; `[]` is valid.
- Set `castShadow = true` on every mesh. Do not change materials.
- On failure reject with an `Error` whose message includes the URL.
- `disposeCarModel` disposes every geometry, material and texture under `model.root`.

## Done when
`npm run build` passes, the file is under 220 lines, only the listed file changed.
