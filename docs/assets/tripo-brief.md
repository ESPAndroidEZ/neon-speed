# Tripo3D brief (free tier)

Goal: five car bodies as GLB files. The game works without them (procedural cars) and picks each one up automatically when the file exists.

Budget: the free tier gives about 13 generations. Plan: 5 cars x 2 tries = 10, 3 spare. Check the current limits and terms on the Tripo site first (the numbers and UI names change). Free-tier outputs have historically been public and under a CC BY licence: if that is still true, add the credit line to the game's credits and README before sharing the demo.

## Files (drop into `public/models/`)

| File | Car | Notes |
|------|-----|-------|
| `civic.glb` | Honda Civic hatchback, late 90s | starter, white |
| `350z.glb` | Nissan 350Z coupe | orange |
| `rx7.glb` | Mazda RX-7 (FD) | yellow |
| `evo.glb` | Mitsubishi Lancer Evolution VIII | blue, big rear wing |
| `supra.glb` | Toyota Supra (A80 or A90) | red, big rear wing |

## Prompts (text to 3D)

Shared style (put at the start of every prompt):
`game-ready street racing car, realistic proportions, clean low-poly body, four wheels on the ground, tinted windows, no driver, no text, no logos, plain glossy paint, centred, 3/4 front view`

Then add one of:
- Civic: `late 1990s Honda Civic hatchback, stock, white paint`
- 350Z: `Nissan 350Z two-door sports coupe, orange paint, slightly lowered`
- RX-7: `Mazda RX-7 FD3S, pop-up-free headlights, low curvy coupe, yellow paint`
- Evo: `Mitsubishi Lancer Evolution VIII sedan, blue paint, large rear wing, hood scoop`
- Supra: `Toyota Supra sports coupe, red paint, large rear wing, long hood`

Image-to-3D works better if you have a clean side or 3/4 reference photo with a plain background.

## Export settings

- Format: **GLB** (binary glTF). Not FBX or OBJ.
- Keep textures (PBR if offered). Texture size 2K is fine: the optimiser shrinks it.
- Prefer the "low poly / quad" or face-limit option at about 30,000 to 60,000 faces. Higher is fine for the demo, the optimiser handles textures not polygons.
- Orientation, scale and origin do NOT matter: the loader normalises them (long axis along Z, 4.3 m, ground at y = 0, centred).
- Do not rig or animate.

## After dropping the files

1. `scripts/optimize-models.sh` shrinks textures to 1024 px WebP and prunes (originals go to `assets-src/models/`, git-ignored).
2. `npm run dev`, open the Garage, select the car. A pink arrow shows where the GAME thinks the nose is. If the model faces another way, use the rotate buttons (or `,` and `.` keys, hold Shift for 1 degree). The fix is stored in the browser. Press Copy and paste the line to Claude so it goes into `src/data/cars.ts` for everyone.
3. Baked wheels do not spin or steer (they are part of the mesh). Paint colour only changes cars whose body material can be told apart; a single baked texture keeps its own colour. Underglow works on every car.
4. If a model looks wrong in game (too dark, tiny, sideways), tell Claude the car id and what you see.
