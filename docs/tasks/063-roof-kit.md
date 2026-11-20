# Task 063: Roof kit for Neon Harbor buildings (AC units, water tanks, antennas)
Files: src/world/open/roofKit.ts tests/roof-kit-check.mts
Check: npx tsx tests/roof-kit-check.mts
Branch: qwen/063-roof-kit
Contract (read-only): Footprint, DistrictId in src/types/world.ts; Geo in src/world/open/chunkGeo.ts (pos, nrm, uv, idx arrays)

## Why
City roofs (W5 open world) are flat boxes. Claude will call your function from chunkGeo to add roof clutter into the existing ROOFS geometry (no new material, no new draw call).

## Export exactly
export function roofDetails(f: Footprint, roofY: number, seed: number, out: Geo): number; // returns triangles added

## Behaviour
1. Pure TypeScript: no `three` import. Append to `out` exactly like chunkGeo's quads: 3 floats per position and normal, 2 per uv, indices offset by `out.pos.length / 3` before you add.
2. Items sit on the roof (y = roofY) inside the rotated footprint rectangle (centre f.x, f.z, half sizes f.hw/f.hd, rotation f.rot about Y: local (lx, lz) -> x = f.x + lx*cos(rot) + lz*sin(rot), z = f.z - lx*sin(rot) + lz*cos(rot)), at least 0.8 m from every edge.
3. Kinds: AC box 1.6 x 1.0 x 1.2 m; water tank = 8-sided prism r 1.4 m, 2.6 m high, on 4 thin legs 0.8 m (legs may be boxes); antenna mast 0.15 m square, 4-9 m high. Outward normals, closed tops.
4. Count per building by district: downtown 2-5 (antenna on towers over 40 m), harbour/industrial 2-4 (more AC), oldtown 1-3 (water tanks), strip 1-3, hills 0-1, bay 0. Small roofs (hw or hd under 3 m) get 0.
5. Deterministic from `seed` (write a tiny mulberry32 inside the file). No Math.random.
6. Budget: at most 220 triangles per building; the function never allocates more than its own small arrays.
7. uv: 0..1 per face (the roofs texture repeats).

## Test (tests/roof-kit-check.mts, PASS/FAIL lines like other tests, exit 1 on fail)
Same seed twice -> identical arrays; every vertex inside the footprint minus 0.8 m (x/z) and y >= roofY; triangles <= 220 per call over 500 random footprints; index count % 3 === 0 and all indices < vertex count; 0 items for a 2 x 2 m roof.

## Done when
npm run build passes, the Check passes, files under 220 lines, only listed files changed.
