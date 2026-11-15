# Task 059: Street props instead of greybox boxes (barriers, guardrails, traffic cars)
Files: src/world/props.ts src/world/propsTraffic.ts src/world/propsBarriers.ts src/world/propsLayout.ts
Check: npx tsx tests/collision-check.mts && npx tsx tests/city-check.mts && npx tsx tests/tracks-check.mts
Branch: qwen/059-props-street
Contract (read-only): PropsLayout / Placed in src/world/propsLayout.ts (the file is yours, keep every existing field); Obstacle in src/physics/obstacles.ts

## Why
The street obstacles are flat-coloured BoxGeometry boxes (props.ts: parked cars = a 1.8x0.7x4.2 box plus cabin box in CAR_COLORS, a blue 0x1f3f7a among them). There is no GLB or Blender prop pipeline in use for these (blender/props/ does not exist; propModels.ts only loads lamp/sign/kiosk/container GLBs), so build them procedurally.

## Behaviour
1. propsTraffic.ts: `buildTrafficCars(layout.parked, paints) : Group`. A low-poly car (under 400 triangles per car): lofted-looking body (several BoxGeometry/CylinderGeometry parts or one custom BufferGeometry: tapered hood, cabin with dark glass, four dark wheels, red tail strip, white headlight strip). ONE InstancedMesh per part, shared materials (body keeps per-instance colour with setColorAt). Same footprint 1.8 x 4.2 m, same placement and yaw as today.
2. propsBarriers.ts: `buildBarriers(list: readonly Placed[]) : Group` jersey barriers (concrete grey, 0.8 m high, 0.6 base, 2 m long, with diagonal yellow/black hazard stripes made as a small CanvasTexture or vertex colours) and `buildGuardrails(list) : Group` (posts + W-beam rail, thin emissive neon strip along the top edge in LOOK-friendly cyan/magenta, emissive <= 1.2 so bloom stays calm). InstancedMesh, shared materials, no per-frame code.
3. propsLayout.ts: add `barriers: Placed[]` and `guardrails: Placed[]` to PropsLayout, filled deterministically (use createRng, same style as cones): barrier runs at 2-3 chokepoints per track, guardrails along the outside of 2-3 long corners, always >= 0.5 m OUTSIDE the drivable edge. They are decoration: NO new collision. The parked-car obstacles stay exactly as now: two circles r 0.95 at +/-1.2 m along the car.
4. props.ts: use the new builders; remove the old parked-car boxes (cones, manholes, vents, zebra and plaza stay).
5. Everything instanced and shared: total draw-call increase at most 12.

## Done when
`npm run build` and the Check pass, files under 220 lines, only listed files changed.

## Hand-check (30 s, Carlos)
`npm run dev`, `/?skip&ai=2`: parked cars look like cars (glass, wheels, tail lights) in varied colours; some striped concrete barriers and neon-topped guardrails by the road; drive into a parked car: same bump as before.
