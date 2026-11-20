# Visual QA report

Screenshots: `logs/qa/{menus,race,phone}/` (subagent captures, max 1280 px, SwiftShader). Problem, root cause, fix, result.

## 2026-11-17 round (perf/online/QA)
| # | Problem | Root cause | Fix | Result |
|---|---|---|---|---|
| 1 | Story lock shows a missing glyph without an emoji font | `🔒` emoji in `ui/storyMenu` | SVG `ICONS.lock` | fixed |
| 2 | Tuning preview shows "0 s / 0 km/h / 0 m" | zero deltas printed | zero segments dropped in any language (`ui/tuneMenu` ZERO marker) | fixed |
| 3 | Garage 216 km/h vs Tuning 206 km/h | garage measured 70 s, rating averages 38-40 s | garage shows `rate().topKph` | fixed |
| 4 | Controls tip covers PAUSED, the results header and the steering chooser | `.rb-tut` z 90 over overlays | CSS `:has()` hides it over `.rb-layer.dim`, `.rb-results`, `.rb-ob` | fixed |
| 5 | Touch buttons draw over the steering chooser (portrait) | `.rb-ob` z 80 < `.rb-tc` z 100 | `.rb-ob` z 110 | fixed (re-capture pending) |
| 6 | Results card taller than 390-430 px landscape screens; no safe-area inset | fixed 16 px font and padding | font `clamp(12px,3.6vh,16px)`, `env(safe-area-inset-*)` padding | fixed (re-capture pending) |
| 7 | Weather cards and hints say snow 45 % grip | text not updated with the 11-17 physics change | 63/53/44 % EN+ES, `tests/grip-text-check` | fixed |
| 8 | Touch buttons over the results screen | only with the `&results` dev flag (real races switch to PODIUM, which hides the pads) | none needed | not a bug |
| 9 | HUD and touch controls stay visible during a story intro cinematic; subtitles cross the speedo | HUD visibility follows `state !== 'MENU'` | open | open |
| 10 | Pause list cut off at the bottom in landscape (scrolls, no cue) | layer height | open | open |
| 11 | Launch tip pop-up behind the speedo in portrait | pop-up position | open | open |
| 12 | Rotate hint probably expires behind the loading card | 6 s timer starts under z 65 card | open (unconfirmed) | open |
| 13 | `npm run visual` neon-clear chroma 0.14 < 0.20 | FIXED 2026-11-21: not a look regression. The check captured a fixed 1.5 s after page load, which on a slow first page caught the loading card / grid instead of the race (even 21dec2f gave 0.14 that way). `scripts/visual-check.mjs` now waits for RACING/FREEROAM (`&probe`) and 10 drawn frames: neon-clear 0.21 in 3 of 3 runs alone and in full runs | was fixed 2026-11-19 (chroma 0.21) | fixed |
| 14 | Radio subtitles stack on top of each other | `Subtitles.flash` never removed the line in its slot | a new line replaces the one of the same kind | fixed |
| 15 | Every rival shows plate RB-0001 | rivals got the default loadout | `rivalPlate(name)` (two letters + four digits, stable) | fixed |
| 16 | HIGH: white glare blob and streaks on the player car roof (same as the garage glare) | the anamorphic streak pass in `fx/finalFx.ts` summed unbounded HDR over 28 taps (confirmed: blob gone with streaks off or capped) | each tap capped at 1.2; headlight spot moved past the nose (3.6 m) | fixed |
| 17 | Tunnel (city HIGH): cyan wall strip blows out half the screen; countdown: green-white glare on the grid's right | emissive 2.2-3x through bloom | tunnel/bridge strips 1.2-1.6, plaza ring 1.4, landmark band 1.8 (`world/tunnelBridge props landmarks`) | fixed (tunnel + plaza re-shot) |
| 18 | Coast HIGH: dark specks on the red sky | cloud cells (`world/sky`) | open | open |
| 19 | `demo` autopilot crashes in the first corners | dev pilot, not visual | open (dev tool) | open |
| 20 | Settings shows "Unlock all cars (free test)" to players | not gated on DEV | dev builds only | fixed |
| 21 | Garage/title HIGH: headlight glare hides the car (Supra, Civic almost invisible) | same streak pass (the showroom spots are off) | same fix as 16 | fixed (Civic re-shot) |
| 22 | Garage 390x844 portrait: the panel covers the car completely | layout has no portrait framing | open | open |
| 23 | A crew member stands between the camera and the car at some garage/menu angles | cast placement (`game/cast.ts` 77-78) | open | open |
| 24 | Main menu on landscape phones: two-column grid takes ~58 % of the width | `menuCss` max-height:520px rule | open | open |
| 25 | Portrait: rotate toast over the cash pill, SELECT MAP title touching it | `ui/rotateHint`, `.rb-cash` | open | open |
| 26 | Online screen layout (alignment, tiny help text), ES default name "Driver" | `ui/onlineMenu` | open | open |
| 27 | ES: money "(1,200 $)" instead of "1.200 $"; "Dock Sprint" untranslated; tuning stats uppercased ("6.8 S") | number format / data strings / CSS uppercase | open | open |
| 28 | ES results: prize "+ $3,000" (English format; same family as #27) | `ui/results` (toLocaleString without locale) | open | open |
| 29 | Online room (ES): ~60 px empty gap in the track picker after "Cliffside Run" (a blank or wrapped button) | `ui/onlineMenu` pick row | open | open |
| 30 | A pedestrian and a parked car right beside the start line (seen in an online race start, ES and EN) | `world/` people / props layout | open | open |
| 31 | Free Drive Hills: the ground poked through the road and sidewalk wedges lay over junctions (screenshot QA, all weathers) | FIXED 2026-11-20: `world/open/groundCarve.ts` + 8 m ground grid + sidewalks stop short of junctions; `tests/ground-carve-check.mts` 12397 -> 0 covered samples; re-shot | fixed |
| 32 | Free Drive: "Now playing" covered the top bar (Pause, key hint) | FIXED 2026-11-20: shown at the bottom centre in Free Drive (checked in a live page: 680-706 px vs bar 10-54 px) | fixed |
| 33 | Free Drive snow: street-light posts look like flat glowing white bars (no lamp head) | FIXED 2026-11-21: the roofs part (posts, furniture, roof clutter) has a vertex colour, side faces 0.22 (`SIDE_SHADE` in `world/open/chunkMesh.ts`), so snow whitens only what faces up; re-shot in snow and clear | fixed |
| 34 | `npm run visual`: one race case sometimes came out near-black in a full run | FIXED 2026-11-21 with #13 (same cause: capture before the race ran) | fixed |
Race luminance and clipping all inside the bands (mean 0.12-0.39, clipped <= 0.68 %). All three reviews are in.

## 2026-11-19 survey
Four-view sheets per track (CLEAR, HIGH): Kestrel, Neon, Maze reviewed, no new bugs after the fixes above. NOT yet reviewed: cliff, mountain, coast, drift-ring, serpent-drift, and RAIN / SNOW on all tracks. Rows 9-12 and 22-27 still open.
