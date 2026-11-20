# Neon Harbor: open-world design (2026-11-17)

## Concept
**Neon Harbor** is the drivable map of Kestrel Bay, the port city of the story (docs/story.md): the bay, the harbour
metropolis around it and the roads out. Night is the default; dusk, dawn and day are Settings presets later. The Loop
races, story events and rivals live inside it; the existing Mountain Pass and Coast Run tracks are its exits.

Drivable area 6 x 6 km (world square [-3072, 3072] m, +X east, +Z north). Districts (one look, lighting and road style each):
| District | Where | Roads | Look |
|---|---|---|---|
| Downtown | centre | tight grid, avenues every 3rd line, a roofed underpass | glass towers, emissive window grids, cool white/cyan |
| Harbour / Docks | south shore | wide roads, long yards, drift pads | containers, cranes, sheds, sodium orange |
| Old Town | west | jittered, bowed alleys, plazas, canal bridges | low houses, warm lamps |
| Neon Strip | east of downtown | avenues, light tunnels, heavy traffic, car meet | huge signs, casino facades, magenta/cyan |
| Hills | north | winding roads, viewpoints | villas, trees, skyline views |
| Industrial / Airfield | far east | long straights, a 1.6 km runway | hangars, tanks, sparse lamps |
| Bay | south-west | Bay Bridge (suspension, 1.4 km) and the highway ring | water, cable lights |
Exits: the coast road leaves the south-east corner (Coast Run), the hills road leaves the north (Mountain Pass).

## Decisions (and why)
1. **Map = authored district grid + generated streets.** A 12 x 12 grid of 512 m cells written as text (`data/world/districtMap.ts`),
   plus authored spines (highway ring, Bay Bridge, hills road, coast exit, mountain exit, runway). Local streets come from the
   existing lattice generator (`world/roads/generate.ts`) per district grammar. Seeded (`core/rng`), deterministic, hashable.
   Why: authored landmarks give the city a recognisable shape; generation gives 6 km of streets with no asset cost.
2. **Physics stays 2D (X/Z).** Height only lifts and pitches the car (`heightAt`, or the edge's own height profile on the
   bridge and ramps). So **no road crosses over another one** in v1: interchanges on the ring are at-grade junctions,
   the downtown underpass and light tunnels are roofed roads at grade, the bridge crosses water only. Why: the approved
   handling and all tests stay untouched; grade separation is a later block with layer-tagged contact.
3. **Car contact in free roam** = `RoadIndex` (nearest edge, lateral offset) for surface and kerbs, plus solid building
   footprints and prop circles from a `GridHash`. Off-road is allowed (sidewalk, grass grip from `SURFACES`); buildings and
   the quay edge are walls; props bump with sparks. Same `CarController` and weather env as races.
4. **Streaming in 128 m chunks**: 48 x 48 chunks, live ring radius 2 (5 x 5 = 25) around the camera, built by a time-sliced
   job queue (at most 3 ms per frame, one chunk part per slice), disposed when they leave radius 3. Per chunk: road ribbons
   merged per material, buildings merged per material (window sheet texture, emissive mask), props instanced, one
   collision bucket. Far skyline: one merged low-poly mesh per district built at load (tallest towers as boxes with an
   emissive window texture), shown outside the live ring. Shared materials everywhere; no per-frame allocation.
5. **Budgets on screen**: LOW <= 250 draw calls and 600k triangles, HIGH <= 500 and 1.5M. Dynamic resolution and the auto
   tier drop already exist. Memory: renderer.info and heap flat after a 10-minute drive (bench `ROAM=1`).
6. **Free Drive** is a new GameState `FREEROAM` (already in the contract) run by `game/freeRoam.ts`, not by RaceManager:
   player car + contact + traffic + POIs. Races started in the city build a temporary track from a road-graph route and hand
   over to the existing RaceManager, so AI skill levels, rubber band and results are reused.
7. **Progress** is a new optional `roam` field in the versioned save (`RoamSave` contract), migrated from older saves as empty.
8. **Qwen task numbers** are 063-067 (030-044 are taken by older tasks).

## Contracts (`src/types/world.ts`, Claude)
`DistrictId`, `RoadKind` (+ highway, bridge, ramp, runway), `RoadNode`, `RoadEdge` (+ oneWay, tunnel, y profile),
`RoadGraph`, `District` (look, fog, grammar id), `ChunkKey`/`ChunkInfo`, `Footprint`, `Poi` (+ sprint, checkpoint, circuit,
trial, jump, token, photo, meet, mission, exit), `TrafficAgent` (edge, lane, s, speed, variant, plus a `role` hook for police
later), `MissionHook` (trigger, objective, fail, reward), `RoamSave`, `WorldClockState`.

## Systems and owners
| System | Files | Owner |
|---|---|---|
| District map, spines, street generator, graph checks | data/world, world/roads | Claude |
| Chunk builder, streamer, skyline impostors, collision buckets | world/open | Claude |
| Free-roam game mode, pause menu (fast travel, respawn, photo, menu) | game/freeRoam, ui | Claude |
| Look: wet streets, windows, beacons, fog per district, water, bridge lights | world/open, render | Claude (+Qwen kit) |
| Traffic agents, signals, pedestrians | physics/roamTraffic, world/open, anim | Claude (+Qwen variants) |
| GPS (A*), minimap, full map, HUD | core/route, ui | Claude |
| POIs, missions, activities | world/pois, game/missions, data/world | Claude (+Qwen data) |
| Building kit, street props, sign atlas, text data, vehicle variants | Qwen tasks 063-067 | Qwen |

## Block order
0. This doc. 1. Foundation: contracts, district map, spines, generator, height, graph tests, chunk builder, streamer,
collision, Free Drive mode (car pick, spawn, pause: fast travel, respawn, photo, menu). 2. Look. 3. Traffic, lights,
pedestrians. 4. GPS, minimap, full map, speed traps, jumps, drift zones, car meet. 5. POIs, missions, city races, save.
6. Qwen tasks 063-067 and the queue. 7. Bench (10-minute drive, every district, 3 weathers), screenshot QA, deploy, docs.

## Tests (each block adds its own)
Same seed gives the same graph hash; graph connected; every district reachable; widths 7-20 m (bridge/highway up to 20);
no building footprint on a road (sampled); no NaN heights; live chunk count bounded while driving; 10-minute bot drive:
heap and renderer.info flat, p95 frame time within the tier budget (SwiftShader proxy, relative only).

## Log of decisions taken while building
- 2026-11-17: the existing 1.5 km Harbor/Neon slice (`world/roads`) becomes the generator core; its districts are renamed
  into the new list (neon -> strip, harbor -> harbour) and extended by the district map.
- 2026-11-20 (block 1b): buildings come from the district grammar along every edge (`world/open/footprints.ts`), not from the old facade-per-sample code; each road segment and junction belongs to the chunk that holds its midpoint / centre (no double drawing); six shared materials (ground, water, road, sidewalk, walls, roofs) so a 5 x 5 ring costs at most ~150 draw calls; free roam drives the player of a never-started RaceManager (so sound, effects and camera work unchanged) and Game delegates FREEROAM through `game.roam = { step, frame }`; the race map's root is hidden, sky and lights stay; race-only HUD parts are hidden by the body class `rb-roaming`.
- 2026-11-20 (block 3): traffic is kinematic (lane positions on the graph, no tyre model): the grip rule is enforced as a corner speed cap sqrt(0.55 g x weather grip x R), below the player's car; yellow lights are decided by time left (go only if the stop line is reached before red), which removed red-light runs; people pace one block's sidewalk and turn back (crossing at crosswalks is a later step); nobody can be run over (people step back, or leave).
