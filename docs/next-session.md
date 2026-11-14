# Start here (new chat)

Paste this as the first message of a new Claude Code chat in this folder:

> Read CLAUDE.md, docs/handoff.md, docs/next-session.md and docs/art-direction.md only. Run `git status -sb`, `pgrep -f qwen-queue`
> and `grep -E " 0(1[6-9]|[2-4][0-9]) " logs/qwen/summary.txt`. Then do the three blocks in docs/next-session.md in order.
> Autonomous, files under 220 lines, build + tests + /checkpoint per block, small tool output. LOCKED: turbo, rain/snow physics,
> save system, camera shake.

## State (2026-11-14, 22:05)
- `main` is clean and green: `npm run build`, `npm test` (all files in tests/), `npm run smoke`, `npm run visual` (needs `npm run dev`).
- No git remote. Dev server: `npm run dev` (http://localhost:5173). Baton line in handoff says `qwen`: set it to `claude` once
  `pgrep -f qwen-queue` is empty; while Qwen runs, work on `main` only in files Qwen is not writing and leave the baton line alone.
- Qwen works in `../racer-qwen` on branches `qwen/NNN-slug`. NEVER `git merge` them (they carry a handoff edit): copy the one file with
  `git show qwen/NNN-slug:path > path`. The summary column `files=0` / EMPTY means the model wrote nothing (8k output limit).

## Block 1: review and merge Qwen's files
DONE, waiting for review (one new file each): 021 archetypesB, 024 graffitiC, 025 signsA, 026 signsB, 027 facadeVariants,
030 partsSpoilers, 031 partsSplitters, 032 partsSkirts, 033 partsHoods, 035 vinylB, 036 propsA, 039 propsD, 017 propYard,
041 partsCatalogMore, 043 loadoutList. (020 archetypesA is already merged.)
EMPTY, re-run after halving the task (4-5 items instead of 6-10): 016, 018, 019, 022, 023, 028, 029, 034, 037, 038, 040, 042, 044.
For each DONE file: read it once, check the rules (no enum, `import type`, no Math.random where the task forbids it, fictional
brands, under 220 lines), run its validation from the task file in a scratch `tsx` script, fix small things yourself, then wire:
| File | Wire into |
|---|---|
| `world/city/archetypesB.ts` | spread into `ARCHETYPES` in `world/city/archetypes.ts` (as A is); `tests/city-check` must pass |
| `world/city/graffitiC.ts` | spread into `GRAFFITI` (`world/city/graffiti.ts`); place as wall decals: new `world/city/decals.ts`, textured planes on facades every ~40 m, add to `worldParts` (city theme) |
| `world/city/signsA.ts`, `signsB.ts` | append to `SIGNS` (`world/city/signs.ts`); the atlas rows are computed from the length, `furniture.ts` loops over `SIGNS` already |
| `world/city/facadeVariants.ts` | in `facades.ts` build sheets with `makeFacadeSheet(kind, seed, base)` per archetype id (cache by variant id) |
| `world/parts*.ts` | spread into `PARTS.spoiler/splitter/skirts/hood` (`world/carParts.ts`); `tests/city-check` checks every part fits |
| `world/vinylB.ts` | spread into `VINYL_PAINTERS` (`world/vinylLayer.ts`) |
| `world/propsA.ts`, `propsD.ts`, `propYard.ts` | spread into `PROPS` (`world/propsKit.ts`); place along kerbs by district in a new `world/city/streetProps.ts` (instancing or merged groups per 150 m) |
| `data/partsCatalogMore.ts` | concat into `CATALOG`; show name, brand and price in `ui/garageLook.ts` part chips; charge `store.data.cash` |
| `ui/loadoutList.ts` | add a "Loadouts" button to the garage (`ui/menu.ts` has `garage()`) |
Report one line per task: merged / fixed / rejected. Archive finished task files with `git mv` to `docs/tasks/done/`.

## Block 2: make the design much better (owner's main complaint: "boxes in the dark")
Judge every change with screenshots: `node scripts/map-shots.mjs` (all maps, logs/maps/) and the checklist in docs/art-direction.md
section 5. Compare with docs/screenshots/before and after. Priorities, biggest visual win first:
1. Shopfront tiles are stretched and too flat up close (`makeShopfrontTexture` in `world/city/textures.ts`): 3 variants, depth (recessed door, awning shadow), smaller glowing area.
2. Road: lane paint, patches, manholes and crosswalk decals as textures on the road ribbon; stronger wet reflections of signs (`world/textures.ts makeRoadTexture`, `worldLook.ts`).
3. Light: real light pools from shop windows and signs onto the pavement (additive decals coloured per sign, like `furniture.ts` streaks), lamp cones visible in fog; fewer pure-black walls.
4. Cars: the procedural bodies still read as low-poly. Bevel the loft (`world/carBody.ts`, `carLoft.ts`), add window trim, door seams, light housings, number plate with `loadout.plate`. Tail-light trails at speed (`fx/`), heat haze at the exhaust.
5. Cliffside: ocean with moon reflection and foam line, lighthouse, sparse road lamps; Container Maze: floodlight masts with cones, crane silhouettes over the lanes, painted lane arrows.
6. Sky: moon disc visible, 2-3 parallax skyline layers with more lit windows; per-district skyline colour.
7. Title screen: 3D hero car turning under the studio strips with the animated neon menu (`ui/menu.ts title()`, `game/showroomCam.ts`); depth of field in garage and cutscenes (a DoF term in `fx/finalFx.ts`, on when `game.state === 'MENU'`).
8. Keep `npm run visual` passing; raise the Neon Night chroma bar from 0.20 toward 0.30 in `scripts/visual-check.mjs` as highlights get more saturated.

## Block 3: Qwen again
Re-split the EMPTY tasks (list above) into files of 4-5 items, same format as `docs/tasks/020-*.md` (generated by the Python in
the session; just copy an existing task file and edit it). Start: `(setsid nohup scripts/qwen-queue.sh <numbers> >> logs/qwen/queue.log 2>&1 < /dev/null &)`.
Then /sync-docs and /checkpoint.

## Where things are (session 5 and 6 additions)
Look: `core/looks.ts`, `data/palettes.ts`, `world/sky.ts`, `fx/finalFx.ts`, `world/envMap.ts`, `game/weatherApply.ts`.
City: `world/city/{textures,archetypes,details,signs,graffiti}.ts`, `world/facades.ts`, `world/furniture.ts`, `world/worldParts.ts`, `world/yard.ts`, `world/cliffside.ts`.
Cars: `data/loadout.ts`, `world/{carAppearance,vinylLayer,rims,carParts,carWheels,proceduralCar}.ts`, `ui/garageLook.ts`.
Tuning: `data/{upgrades,setup,carBuild}.ts`, `physics/{carRating,dyno}.ts`, `ui/{tuneMenu,dynoGraph}.ts`. Graphics: `core/graphics.ts`, `ui/graphicsSettings.ts`.
HUD: `ui/{hud,gauge}.ts`. Theme tokens: `ui/theme.ts`. Maps: `data/tracks/*.ts`. AI: `physics/ai*.ts`. Story 2: `data/story2*.ts`.
Dev flags: `?skip ?demo=straight ?track=neon|maze|cliff ?look=dusk|grit ?car=supra ?ai=3 ?w=rain ?at=40 ?ff=3 ?screen=garage|tune|maps|settings|crew ?showcar=supra&angle=q ?event=c2-neon`.
Screenshot helper used all session: a Playwright script with SwiftShader flags (see `scripts/map-shots.mjs`); frames can come out black under load, retry once.

## Known issues
- Rivals in crowded fields get pinned and lifted back onto the road after 9 s (2-4 times per 8-car race).
- A bright specular blob can appear on wet road from the palette rim lights at low angles (`world/world.ts` keyL/accL).
- No real GPU review yet: bloom and exposure were tuned on SwiftShader.
- Android/iOS projects are generated but never built (no SDK here): docs/mobile.md.
