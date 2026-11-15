# Task 056: Better-looking people models (`buildPerson`)
Files: src/world/peopleModels.ts src/world/peopleParts.ts src/world/peopleOutfits.ts src/dev/devStart.ts
Branch: qwen/056-people-models
Check: npx tsx tests/qwen/people-models-check.mts

FRESH START. Read AGENTS.md, then src/types/people.ts (THE CONTRACT: do not edit it or anything in src/types/), then
src/world/peopleAdapter.ts (the current simple version: copy its joint-building loop exactly, it is correct).

## Build
`src/world/peopleModels.ts` exports exactly:
- `export function buildPerson(spec: PersonSpec): PersonRig` (same signature as peopleAdapter.buildPerson).
- `export const variantCount = 12;` (or more): at least 12 clearly different looks come out of different `spec.seed` values
  (vary small things from the seed: collar style, sleeve length, shoe sole colour, belt, jacket zip, hair volume).
Split helpers into `peopleParts.ts` (body parts: limbs, hands, head, hair) and `peopleOutfits.ts` (jacket, collar, pants,
shoes, accessories) so every file stays under 220 lines.

## Rules (the check enforces the first four)
1. Every joint in `JOINTS` exists, is a `Group` named exactly like the joint, positioned at `REST[joint]` under `PARENT[joint]`.
   Meshes hang off the joints (pivots at the joints): rotating `foreArmL` must bend the elbow.
2. Geometry and materials are CACHED and SHARED (a Map keyed by shape or colour, like peopleAdapter): two people with the
   same spec use the same geometry objects. No allocation after build.
3. At most 4000 triangles per person, no NaN.
4. Same seed = same person.
5. Imports: only `three` and `../types/people` (and `../types/game` if needed). No new packages.

## Looks (the goal: much better than peopleAdapter)
- Rounded limbs from `CapsuleGeometry` or `LatheGeometry` (tapered: thicker at the top), proper shoulders (a sphere at each
  upperArm joint) and hips, knees and elbows that do not show gaps when bent.
- Hands: a palm block plus a simple thumb block, skin colour.
- Head: slightly egg-shaped, a nose bump, ears; hair styles per `spec.hairStyle` (short, long, spiky, bun, slick, bald,
  mohawk, curly: curly = several small spheres).
- Jacket with a collar and slightly wider than the torso; pants; sneakers or boots with a lighter sole.
- Accessories: cap with a brim, sunglasses, hood (behind the head).
- Body variants: slim / average / broad change shoulder and hip width and limb thickness.
- Materials: `MeshStandardMaterial`, `flatShading: true`, roughness 0.6..0.85 (toon-ish). Add an optional neon rim tint:
  `export function setRimTint(rig: PersonRig, color: number, strength: number)` that sets `emissive`/`emissiveIntensity`
  on that rig's materials (clone the cached material for that rig only when strength > 0).

## Preview
In `src/dev/devStart.ts` change ONLY the import `import { buildPerson } from '../world/peopleAdapter';` to
`import { buildPerson } from '../world/peopleModels';` so `npm run dev` then `http://localhost:5173/?people` shows the
12-person gallery (each playing a different animation).

## Done when
`npm run build` passes and `npx tsx tests/qwen/people-models-check.mts` prints ALL PASS. Only the four files above changed.
