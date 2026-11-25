# Underground-style round: the plan (2026-11-25)

Start a new window with: "Read docs/skills.md, docs/handoff.md and docs/underground-plan.md, then start the next unchecked stage."

## What the owner wants
Neon Speed should handle and flow like a street-racing open-world game of the Underground era (the owner named
Underground 2 as the reference): drive around a night city, find races and challenges, tune and paint the car, come
back to the garage. **Ideas only.** Nothing is copied from that game (no assets, code, data, names, music, map). Every
number is tuned on our own cars with our own measuring labs, every name and look is ours. Do not fetch or decompile
nfsu2.xyz or any other port. (Owner confirmed this on 2026-11-25.)

## Restore point
Git tag `driving-backup-2026-11-25` (also `handling-v1`): the driving, physics, camera and Free Drive exactly as
deployed on 2026-11-25. Return to it with `git checkout driving-backup-2026-11-25 -- src/physics src/camera`.
Classic driving must stay the default and must keep passing every existing test.

## Hard rules (do not break)
- Locked: turbo model, rain/snow physics, approved handbrake carry and drift hold in `physics/legacy/stability`, STANDARD assist = approved handling (see CLAUDE.md). Street feel is built around them.
- Files under 220 lines, no enum/namespace/constructor param properties, `import type`, physics pure TS with fixed 1/60 s steps and no per-step allocation.
- EN + ES strings (i18n tests), brands on signs and parts fictional, saves versioned with optional new fields.
- Docs after every change, `/checkpoint` at the end of each stage, commit and push after each substep.

## Stage 1: Driving style (feel)
Goal: a setting **Driving style: Classic (default) / Street**. Classic = today, bit for bit.
Street changes (all behind the setting, none inside the locked models):
- More grip and sharper turn-in at street speeds, a little less understeer (via the per-car `CarTuning` multipliers applied at car build, like `applyBuild`), same weight transfer data.
- Nitro: stronger push and a longer felt kick, with a speed blur at the screen edges and a small FOV push (camera/fx only; the turbo model stays untouched).
- Quicker steering response and a camera that stays closer behind at speed (`camera/chaseCam.ts` tuning).
- Drift feel: easier to start a slide on the gas, smooth exit (tune around the approved handbrake, never replace it).
Where: `physics/carTuning.ts`, `data/carBuild.ts`, `camera/chaseCam.ts`, `fx/`, settings in `core/settings` + `ui` settings page, `saveParse.ts` for the new setting.
Measure first (labs in `tests/lab/`): 0-100 km/h, turn radius at 60/100 km/h, slide angle on handbrake, nitro gain, for both styles, and keep the numbers in `docs/perf.md` or a new `docs/feel.md`.
Tests: a new `tests/driving-style-check.mts` (Classic equals the backup numbers; Street is grippier and keeps `tests/balance-check` bands; handbrake tests unchanged).
Acceptance: Classic passes everything unchanged; Street is clearly different in the lab numbers and playtests well.

## Stage 2: World flow (Free Drive)
- **Challenge cars**: some traffic cars are "challengers". Pull up beside one and flash lights (a key / button) to start a street outrun to a marked point; win for cash + REP. Reuse `physics/roamTraffic` roles, `core/duels.ts`, `game/roamActivities.ts`, `RoamProgress`.
- **Race icons on the map** start events from the city (already partly there: race rings, story pins). Add event-type icons and a legend.
- **Shops as places**: the garage, a parts shop and a paint shop as ring places in the city (like story pins: `game/roamStory.ts`, `core/storyPins.ts`) that open the existing garage screens.
- **Areas unlock with REP**: districts beyond the starting ones open at REP levels (`core/rep.ts`), with a clear "locked until level N" on the map.
- District completion % already shows in the pause menu (`game/districtDone.ts`); extend it to count events and shops.

## Stage 3: Event types started from the city
Outrun (A to B against one rival, no laps), street sprint (short point-to-point), drag (straight line, gear timing, uses `core/launch`), drift (score run in a zone, `physics/driftScorer`). Reuse `RaceManager`, `core/knockout.ts`, `core/medals.ts`, `game/freeFinish.ts`, `data/tracks` city circuits. Each event shows its type icon and pays REP and cash.

## Stage 4: Menus and customisation
Garage flow: parts (existing tuning), paint, **vinyls and underglow** (new, procedural, our own designs), plus event select screens in the same visual style (`docs/ui-style.md`, `docs/art-direction.md`). Underglow already exists on the Strip; extend it to all cars as a purchasable part.

## What exists today (do not rebuild)
Free Drive city Neon Harbor (roads, traffic, peds, police/heat, speed cameras, drift zones, car meet, 50 tokens, story pins, missions), REP and car gate, medals, duels, Knockout, time of day, fly-by, stuck recovery, district %. See `docs/open-world.md`, `docs/nfs-vision.md`, `docs/handoff.md`, `docs/skills.md`.

## Order and checkpoints
Stage 1 -> /checkpoint -> Stage 2 -> /checkpoint -> Stage 3 -> /checkpoint -> Stage 4 -> /checkpoint -> deploy with `scripts/deploy-server.sh` and check the live URL. Visual QA with Playwright subagents at 844x390 on a snapshot of HEAD (see docs/skills.md).

## Progress
- [x] Stage 1 Driving style (2026-11-25: docs/feel.md, tests/driving-style-check.mts)
- [x] Stage 2 World flow (2026-11-25: challengers + outrun, shops as rings, REP areas, map icons + legend, district % counts events and shops; tests/world-flow-check.mts)
- [x] Stage 3 Event types (2026-11-25: sprint and drift rings per district, runway drag with manual gears, outrun from challengers; tests/city-events-check.mts)
- [x] Stage 4 Menus and customisation (2026-11-25: underglow kit + vinyls bought per car, 3 new vinyls, paint shop opens the look panel, Street events screen; tests/paint-shop-check.mts)

## What was built (2026-11-25) and how it fits
- Stage 1: see docs/feel.md.
- Stage 2: `game/roamFlow.ts` (RoamFlow inside RoamActivities: challenger slots 5/18/31 of the traffic pool with a pink marker, shop rings, `AreaGuard` turning the car back at a locked border, `FLOW_HOOK`), `game/flowLaunch.ts` (shop and challenger cards, `markVisit`, `outrunNear`), `core/areaLocks.ts` (AREA_REP downtown/harbour 1, strip 2, oldtown 3, industrial 4, hills 6, bay 8; the district of the next story place is always open), `core/shops.ts`, `ui/roamOffer.ts`, `ui/roamToast.ts`, map kinds + letters in `ui/roamFullMap.ts` (GLYPH), markers in `game/roamMarkers.ts`, `game/districtDone.ts` (+ events won `win:<id>`, shops `shop:<kind>` in `roam.visited`).
- Stage 3: `core/cityRace.ts` kinds (circuit, sprint = loop with `sprintEnd` 0.56, drift with target 1.2 pts/m, run = outrun), `core/cityEvents.ts` (placement, `planCityEvent` rebuilds any id: `city-<d>`, `city-sprint-<d>`, `city-drift-<d>`, `city-run-<node>`, `city-drag-<d>`), `core/cityDrag.ts` (1 km straight), `game/cityRaces.ts` (`cityGraph`, `findCityEvent`, resolver), rivals per kind in `game/cityRaceLaunch.ts`, drag forces the manual gearbox in `game/inputSetup.ts`. Lab `tests/lab/city-drift.mts`.
- Stage 4: `core/shopItems.ts` (`glow` $1,200, `vinyl:<id>` $600, `SaveData.bought`), `ui/glowShop.ts`, vinyl buy row in `ui/garageLook.ts` (working copy: previews never reach the save), `world/vinylC.ts` (skyline, split-fade, pinstripe), the player's car has no underglow without the kit (`RacerViews.add`), `ui/eventsMenu.ts` (main menu > Street events).
- QA (2026-11-25, Playwright 844x390, two passes): fixed the phone map legend (two columns, all labels), the locked-area message (a toast over the job card), the shop card's double ENTER, the garage cash pill after a purchase, the vinyl chip price tag after buying, the Street events overlay (opaque, over the header), the look panel scrolling clear of the sticky action bar; dev `?roam=<district>` and labs skip the REP lock (the visual check had silently stayed in Downtown). Open: a real challenger was never met by the QA bot (traffic respawns far after a teleport; the offer and race were triggered directly), the sprint minimap shows the whole loop.
- Not built: police-free outrun "lead by 300 m" rule (an outrun is a one-rival sprint), challenger collision with the kinematic marker (they are normal traffic until the race), per-kind ring colours (one ring mesh for draw-call budget).
