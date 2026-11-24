# Neon Speed: "feels like a real NFS game" plan (2026-11-24)

Owner brief: make it look and play like a real Need-for-Speed-style game. Play the story by driving to places in the
city, more modes on more tracks, visual and play polish. "Just needs to be quite good." This is a plan, ordered by
value per effort, built on what exists (Free Drive city Neon Harbor, 9 maps, 4 story chapters, tokens, missions,
traffic, garage, tuning, online lobby, daily challenge). Each item says what it needs. Nothing here changes the locked
items (turbo, rain/snow physics, handbrake feel, STANDARD assist).

## 1. The big idea: the story lives in the city (the "hub")
Today the story is a menu list. A real NFS has a world with places you drive to. Plan:
- **Story pins on the Free Drive map.** Each story event gets a place in Neon Harbor (a glowing amber ring + icon on
  the minimap and the full map, same markers system as `game/roamMarkers.ts`). Driving into the ring starts the
  pre-race dialogue and then the race on its own map (maps stay as they are; the ring is the doorway). The Story menu
  stays as a "chapter select / replay" list.
- **Characters stand at their places** (Mara's garage, Cain's lighthouse, Pixel's yard, the Broker's tower): a figure
  from `world/characters` with a floating name tag. Walk-up is not needed: drive into the ring, a short intro card
  appears (name, role, one line). This also fixes the owner's note "characters need introductions".
- **Phone calls while driving**: Mara / Switch / Pixel call over the HUD (existing `phone` lines) with the next
  objective: "Meet Pixel at the harbour yard" and a GPS waypoint auto-set. Reuse `RoamMap.waypoint`.
- **Chapter progress bar** on the pause screen: "Chapter 4 · 2 of 4 · next: The Cliff Lodge".
Needs: `data/story/places.ts` (event id -> district + ring), a `StoryPins` class like `CityRaceSpots`, 1 dialogue hook.
Effort: medium. Value: very high (this is the "play the history by going to places" request).

## 2. Modes (more reasons to drive)
Existing: Story, Free Race (time trial / 3 / 5 rivals), Free Drive, Online, Daily challenge. Add, cheapest first:
1. **Sprint events in the city** (done as city races): give each district a 3-race "cup" with a trophy and cash.
2. **Time Attack ladder**: per map, bronze/silver/gold times; medals shown on the map card. Pure data + UI.
3. **Drift Attack**: a score run on the drift maps (exists as story events) as a free mode with a leaderboard slot.
4. **Knockout** (last place is eliminated each lap, 4 laps): small change in `RaceManager` result logic.
5. **Speed Trap / Top-speed run**: the cameras exist in Free Drive; add a "gold at 250 km/h" streak goal.
6. **Rival challenge**: beat a named rival one-on-one to take their car (uses `rivals.ts` + `unlocks`).
7. **Police chase (later, larger)**: the traffic `role` hook exists; a heat meter, 3 cop cars that ram. Biggest
   "real NFS" feeling but also the biggest build; schedule after 1-6.
8. **Reverse and night variants** of existing maps (same data, `reverse: true`, weather/time presets) = free content.

## 3. Progression the player can feel
- **Reputation (REP) level** that rises with everything (races, drift score, tokens, missions). Unlocks cars, parts,
  paint and map variants. One bar in the main menu header. Data: add `rep` to the save (versioned, migrate as 0).
- **Car classes and shop**: show the class badge (D / C / B / A / S) from PR (already rises with upgrades) on every
  car card and in race select ("this event: class B"). Wrong class = locked, not hidden.
- **Garage with a "dream car" board**: next car to buy shown on the main menu with a price progress bar.
- **Daily / weekly goals** (3 small tasks) feed REP and cash; the daily challenge exists, add two siblings.
- **Collections**: 50 neon tokens (done), plus 12 billboard jumps and 10 photo spots (photo exists). Each set pays a car.

## 4. Look: what makes screenshots read as "a real game"
- **Menu**: live 3D car in a lit garage behind the menu (the showroom exists), slow orbit, brand-new car spot light,
  title card per mode with a hero image (generated procedurally: map silhouette + colour gradient). Keep it GPU-cheap.
- **Race intro**: 3 s fly-by of the grid with names and car names (the cutscene system exists), then the countdown.
- **HUD**: finish the design-system pass (docs/ui-story.md): consistent gauge, position/lap pill, rival gap tags, a
  "wanted" style banner for events, compact on phones. Colour-blind mode + text scale (planned) keep it accessible.
- **City look**: wet-street reflections (blob fake exists), light bloom, lens streaks on headlights, time-of-day
  presets (dusk, night, dawn; planned), neon signs with the fictional brands, steam vents, rain splash on the lens.
- **Cars**: per-car livery decals and number plates (plates exist), tyre smoke subtle, underglow for the Strip.
- **Photo mode** polish: filters, a frame with the car name; share/save PNG exists.
- **Results screen**: podium moment, cash and REP counting up, "new record" stinger, replay of the best moment.

## 5. Feel (play)
- **Crash and traffic feedback** is in (shove, spin, no snap). Add small camera kick and a short slow-motion on a big
  takedown/near miss, and "near miss" combo points in Free Drive (combo HUD exists).
- **Nitro** gets a screen-edge streak effect and FOV push; keep the locked turbo model untouched.
- **Handbrake camera zoom** soften (owner note), **tilt mode** manual/auto gas toggle (done) and landscape lock.
- **Rubber band is capped** (kept). Add difficulty names per event (Easy / Normal / Hard) shown on the card.
- **Audio**: deep-house playlist (9 songs exist; owner wants more), per-district radio chatter by DJ Switch, engine
  recordings (done), tyre/wind layers, a short stinger per event result.

## 6. Content roadmap (what to build, in order)
| # | Item | Size | Why |
|---|------|------|-----|
| 1 | Story pins + place rings + character intro cards (section 1) | M | the headline request |
| 2 | Chapter 5 "The Bay Bridge", prologue, epilogue, Characters codex | M | story length |
| 3 | REP level + class badges + shop locking (section 3) | M | progression feeling |
| 4 | Time Attack medals + Knockout + Rival challenge (section 2) | M | more modes, mostly data |
| 5 | Menu hero (3D garage behind menu), race intro fly-by, results polish | M | looks |
| 6 | Reverse/night map variants | S | free content |
| 7 | Time-of-day presets in Free Drive (dusk/dawn) | S | looks |
| 8 | Billboard jumps (needs lift in the physics: blocked until a jump model exists) | L | later |
| 9 | Police chase / heat | L | the NFS signature, last |
| 10 | More deep-house songs, district radio | S | audio |

## 7. Guardrails
- Phone first: every new screen is checked at 844x390 / 740x360 landscape (see docs/ui-story.md).
- LOW tier stays inside its budget (docs/perf.md); new effects get a Graphics setting and an off switch.
- No allocation per frame; files under 220 lines; EN + ES strings (tests/i18n-check enforces).
- Brands on signs and parts stay fictional; real car brands only in `data/cars.ts`.
- Saves stay versioned with migrations; new fields optional.
