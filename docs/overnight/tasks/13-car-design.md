# 13 Redesign all eight cars

Carlos lifted the "no visual work on existing cars" rule on 2026-11-16: improve the design of ALL cars: Civic, Golf IV GTI, 350Z, RX-7, 535d Touring (E61), M3 (E46), Evo VIII, Supra. The procedural cars are lofted bodies from proportion data in `data/cars.ts` (`world/carBody.ts`, `carLoft.ts`, `carParts.ts`, `palettes.ts`, `vinylLayer.ts`). A Tripo GLB in `public/models/` is used if present and must still work; do not touch GLBs.

Read first: `docs/art-direction.md` (looks, palettes, quality bars, budgets) and the car section of `docs/code-map.md`. Previous screenshots live in `docs/screenshots/`, car shots are made with `node scripts/car-shots.mjs`.

Per car, aim for a recognisable silhouette and details that read at game camera distance:
- Correct proportions and stance (wheelbase, track, ride height, overhangs, roofline, wheel arches that actually wrap the tyre), a proper greenhouse with pillars and a visible interior hint, bevelled/rounded panel edges instead of flat boxes.
- Signature features: Civic hatch with the cut tail; Golf IV round headlights and the wide C pillar; 350Z the rounded wedge with the curved roofline and boomerang lights; RX-7 the low pop-up-style nose, curvy FD flanks and pronounced rear haunches; 535d the long wagon roof with roof rails and L-shaped rear lights; M3 E46 the bulging bonnet powerdome, quad round headlights, fender gills; Evo VIII big rear wing, bonnet vents, intercooler scoop; Supra the big fixed wing, long bonnet, round tail lamps.
- Light housings (headlight/taillight shapes with emissive lenses), door seams and handles, window trim, mirrors, grille and bumper openings, exhaust tips, number plate (`loadout.plate`), wheels with spokes and brake discs/calipers visible, tyre sidewall.
- Paint: richer clear-coat look (environment reflection, fresnel), nicer palettes per car; stay within the budgets of art-direction.md (triangles, draw calls). Check `scripts/drawcalls.mjs` and `npm run model-check` equivalents so budgets still pass.

Sub-checklist (one car per tick; commit per car):
- [ ] Civic  - [ ] Golf IV GTI  - [ ] 350Z  - [ ] RX-7  - [ ] 535d Touring  - [ ] M3  - [ ] Evo VIII  - [ ] Supra
- [ ] After each car: `node scripts/car-shots.mjs` (needs dev server: `scripts/with-dev.sh '...'`), have a subagent look at the downscaled (<= 1280 px) front 3/4, side and rear shots and report what still looks off (flat, floating wheels, z-fighting, wrong proportions). Fix what it finds once.
- [ ] Garage view and in-race chase view both checked on at least one car after all changes.
- [ ] `npm run visual` (CLEAR/RAIN/SNOW readability) still passes; `tests/` car tests (proportions, parts fit, `tests/city-check`) pass; Physics data (mass, wheelbase used by physics) is NOT changed: if you change wheelbase/track in visual proportions, keep the physics numbers in `CarTuning` as they are, or update both and run `tests/balance-check` unchanged-green.
- [ ] Keep each `.ts` under 220 lines: split per-car shape data into `data/carShapes*.ts` or `world/cars/*.ts` if needed.

Done when: all eight cars improved with before/after screenshots saved to `docs/screenshots/cars-2026-11-16/` (small PNGs, <= 1280 px wide, max ~12 files), checks green, and the report lists each car with one line on what changed.
