# Task 064: Street furniture placement for Neon Harbor (benches, bins, hydrants, bus stops)
Files: src/world/open/streetFurniture.ts tests/street-furniture-check.mts
Check: npx tsx tests/street-furniture-check.mts
Branch: qwen/064-street-furniture
Contract (read-only): RoadGraph, RoadEdge, DistrictId in src/types/world.ts; SIDEWALK in src/world/roads/grammar.ts

## Why
The open-world sidewalks are empty. This task only PLACES items (pure data); Claude builds the instanced meshes later.

## Export exactly
export const FURNITURE_KINDS = ['bench', 'bin', 'hydrant', 'busStop'] as const;
export type FurnitureKind = (typeof FURNITURE_KINDS)[number];
/** Items along the given edges: 4 floats each (kind index, x, z, heading facing the road). */
export function placeFurniture(g: RoadGraph, edgeIds: readonly number[], seed: number): Float32Array;

## Behaviour
1. Pure TypeScript, no `three`. Walk each edge's centre line (`pts` x0,z0,x1,z1,..., `cum` running length). Items stand on the sidewalk: offset from the centre line = edge.width / 2 + SIDEWALK / 2, on both sides.
2. Skip the first and last (node radius + 6 m) of each edge (junctions), skip edges of kind 'highway', 'runway', 'bridge'.
3. Spacing along one side: bin every 40-60 m, bench every 70-110 m, hydrant every 90 m (+-15), one bus stop per avenue edge longer than 100 m (middle of the edge, right-hand side). Two items on the same side never closer than 6 m.
4. District mix: strip and downtown full density, oldtown 0.8, harbour/industrial 0.4 (no benches), hills 0.3 (no bus stops).
5. Heading: the item faces the road (perpendicular to the edge direction, pointing at the centre line).
6. Deterministic from seed + edge id (mulberry32 in the file). The same edge gives the same items whatever other edges are in the list (Claude calls it per chunk).

## Test (tests/street-furniture-check.mts)
Use generateRoads(7) from src/world/roads/generate.ts: every item is at least edge.width/2 + 0.5 m from its edge's centre line and inside the world (|x|,|z| < g.half); spacing rule holds; same result twice; per-edge independence (call with [e] and with [e, other] and compare e's items); total items over the whole city between 2000 and 30000; prints counts per kind.

## Done when
npm run build passes, the Check passes, files under 220 lines, only listed files changed.
