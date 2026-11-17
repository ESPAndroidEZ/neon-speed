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
| 13 | `npm run visual` neon-clear chroma 0.14 < 0.20 | pre-existing since the merge of main | open | open |
| 14 | Radio subtitles stack on top of each other | `Subtitles.flash` never removed the line in its slot | a new line replaces the one of the same kind | fixed |
| 15 | Every rival shows plate RB-0001 | rivals got the default loadout | `rivalPlate(name)` (two letters + four digits, stable) | fixed |
| 16 | HIGH: white glare blob and streaks on the player car roof (same as the garage glare) | bloom + streaks on a roof highlight (suspected headlights/stage light + streak pass) | open | open |
| 17 | Tunnel (city HIGH): cyan wall strip blows out half the screen; countdown: green-white glare on the grid's right | emissive strength through bloom | open | open |
| 18 | Coast HIGH: dark specks on the red sky | cloud cells (`world/sky`) | open | open |
| 19 | `demo` autopilot crashes in the first corners | dev pilot, not visual | open (dev tool) | open |
Race luminance and clipping all inside the bands (mean 0.12-0.39, clipped <= 0.68 %). Menus review: pending.
