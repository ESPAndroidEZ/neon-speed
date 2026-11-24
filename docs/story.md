# Neon Speed: story and opening cinematic

Tagline: **"Every street remembers who bled for it."**

## Lore (round 2)

- **Kestrel Bay** is a port city. When the container trade left, the docks emptied and night races started on the empty yards and quays. Kids spray-painted the **Harbor Loop**.
- **Racer's Blood** is the **Red Hand Wall** at the finish line. Winners press a red-painted hand on it. The saying: *"every street remembers who bled for it"* (sweat, risk, wrecks; PG).
- **Cain Vega**, the Loop's first legend, vanished after a crash at the docks 12 years ago. Everyone thinks he is gone. His sister **Mara** runs **Gearhead Garage**. The beat-up Civic was Cain's first car; Mara rebuilt it and gives the Rookie the keys.
- **Dante Voss**, Cain's protege and rival, turned the Redline crew into **Redline Holdings**. He is buying the docks and the debt on Mara's garage to turn the Loop into a private sponsored circuit and erase the street scene.
- **The Rookie** arrives with nothing but the car. Mara sees Cain's feel in how they drive.
- **DJ Switch** broadcasts pirate radio from a crane cab above the docks and knows everything. Secretly he is **Cain** (revealed after the Chapter 1 finale).
- Chapter 1 rivals: **Jinx** (Evo, aggressive, rain specialist), **Tank** (Supra, heavy), **Vex** (350Z, drifter), **Dante** (black and gold RX-7). Street rookies Pixel, Lola and Rook fill the early grids.

Where it appears in the game: skippable "Previously in Kestrel Bay" title cards before the first intro cinematic (`data/lore.ts` PREVIOUSLY); the Crew screen with bios and the Red Hand Wall (one red handprint unlocked per event, also painted on a wall at the start line); loading-screen tips from the lore; in-race radio chatter from Switch (overtakes, crashes, drift combos, weather, laps, rival names: `data/radio.ts`, `game/radio.ts`); after beating Dante a final radio message reveals that Switch is Cain.

## World

Kestrel Bay, a port city that never fully dries out: rain on the cranes, neon on the wet asphalt, and a first snow coming. Street racing runs after midnight on the **Kestrel Bay Streets** circuit (a tight 1.4 km street course: Main Street, a canal bridge, a plaza hairpin, the dock strip, alleys and a tunnel), nicknamed the **Harbor Loop** and controlled by the Redline crew.

## Cast

- **You (the Rookie).** New in town, silent, drives Cain's beaten-up Civic.
- **Mara Vega.** Owns Gearhead Garage, your mentor, Cain's sister. Appears as phone calls. Her garage is three days from foreclosure.
- **Dante Voss.** Leader of Redline Holdings. Calm, polite, ruthless.
- **DJ Switch.** Pirate radio voice of the city. Narrates the cinematic, the race intros and live chatter. Secretly Cain Vega.

## Chapter 1: "Wet Asphalt" (the demo)

1. **Opening cinematic.** Establish the city, the car, the debt.
2. **Race 1, Warm-up Circuit (dry).** Beat the street rookies. Earn the first cash, teaches drift and nitro.
3. **Mara's call.** The bank wants the garage by Sunday. Redline's lawyers are behind it.
4. **Race 2, Dock Sprint (rain).** Grip drops, drifts get easier to start and harder to catch. Earn cash, buy the second car.
5. **Race 3, Drift Night (first snow).** Scored drift event on the docks. Lowest grip, big payoff.
6. **Finale, Harbor Loop vs Dante (rain turning to snow).** Win and the garage is saved.
7. **Ending.** Dante hands you a key: "Tomorrow the whole city will be watching." End card: *Chapter 2: Short Tracks* is coming, with a feedback link.

Demo progression: 3 cars (starter, mid, top), 3 upgrade stages, paint and underglow.

## Opening cinematic: timecoded script

Runs 11.5 s and maps onto the four shots already built in `src/camera/shots.ts`. Tap skips to the whip.

| Time | Shot | On screen / action | Audio |
|------|------|--------------------|-------|
| 0.0 - 2.2 | Front low sweep | Black. Rain hiss, then a hard cut to the headlights: they flare on (emissive pulse). Camera sweeps low across the nose | Rain, idle rumble. **Switch (VO):** "Kestrel Bay. Two a.m." |
| 2.2 - 4.2 | Wheel flyby | Tracking down the flank, tyre spray, neon sliding across the paint | Tyre hiss through a puddle, rev blip. **Switch:** "The rain doesn't wash anything clean here." |
| 4.2 - 8.4 | 360 orbit | Full reveal of the car. Lower-third: *Honda Civic, "The Beater"*. Cranes and signs behind | Synth bed rises, bass pulse. **Switch (4.2-6.4):** "Redline runs the Loop. Dante runs Redline." **(6.4-8.4):** "And Mara's garage is three days from the bank." |
| 8.4 - 10.8 | Rear crane reveal | Camera rises, the road and city skyline open up. Title **NEON SPEED** fades in at 9.4 | Rev builds, synth sting. **Switch:** "So tonight... you drive." |
| 10.8 - 11.5 | Whip into chase cam | FOV kick, motion blur, tagline under the title, countdown 3-2-1 begins | Whoosh, bloom kick, countdown beeps, gameplay music starts |

Notes: every hard cut gets a bloom kick (already wired). In rain races the opening uses the same shots with the rain layer on. The car in the cinematic is always the car you currently drive.

## Race intro cards (one line each, Switch VO)

- Warm-up Circuit: "Warm-up lap. Don't embarrass yourself."
- Dock Sprint: "Wet road, short fuse. Brake earlier than you think."
- Drift Night: "First snow. Sideways is the only way."
- Harbor Loop vs Dante: "Last race. Last chance. Bring everything."

## As implemented (feedback round 1)

Story mode lives in `src/data/story.ts` (text) and `src/game/story.ts` (flow). Events, in order:

| # | Event | Conditions | Objective | Reward |
|---|-------|-----------|-----------|--------|
| 1 | Warm-up Circuit | dry, 2 laps, Civic only, vs Pixel, Lola, Rook | top 2 | race cash + $1,500 |
| 2 | Dock Sprint | rain, 2 laps, vs Jinx, Tank, Rook, Pixel | top 2 | race cash + $3,000, **350Z unlocked** |
| 3 | Drift Night | snow, 3 laps, no rivals | bank 3,000 drift points (was 6,000: bots that slide a lot reach ~2,000-2,700 in 3 snow laps) | points / 3 + $4,000 |
| 4 | Harbor Loop vs Dante | rain turning to snow after 75 s, 3 laps, vs Vex, Jinx, Tank, Dante | win | race cash + $8,000, **Supra unlocked** |

Mara phones before and after events, Dante taunts before the Dock Sprint, after Drift Night and twice before the finale (a cutscene with his black and gold RX-7 on show). After the finale: Dante's key line, then Switch's radio message revealing he is Cain, then the end card *Chapter 2: Short Tracks* with a feedback-link placeholder. The opening cinematic runs the first time with the five DJ Switch captions, the lower-third and the title from the script above. Optional browser speech reads Switch's lines (Settings: Switch voice, default off).

## Chapter 2: "Redline Rising" (implemented, session 5)
Tagline: *Four districts. Four votes. One street.* Rating: PG (no real violence; crashes are cars, not people).

**Premise.** Dante lost the garage but not the city. He turns money into rules: Redline Holdings buys the impound lot, the tow
trucks and the street lamps, then pays every district boss to stay neutral. Cain, as DJ Switch, comes out on air (he is no
longer hiding) and sends the Rookie to win the four votes of the Loop Council: the Neon Strip, the Container Maze, the Cliffside
and the old Harbor.

**Events** (`src/data/story2a.ts`, `story2b.ts`; map in brackets):
1. *Redline Rising* [Kestrel Bay, dry, Rook/Vex/Jinx]: the roadblock night. Dante's offer: "I am simply buying what is for sale."
2. *Neon Night* [Neon Strip, rain, 3 laps]: **Nova**, the drift queen, paid double by Dante to stop you. Win: she votes with you; unlocks the RX-7.
3. *Container Maze* [Container Maze, snow, 4 laps]: **Brick**, dock-union heavy hitter, never lifts, never moves over. Win: unlocks the Evo.
4. *Yard Drift Night* [Container Drift, rain, no rivals]: 12,000 points to win the dock crews (a drift event on the maze).
5. *Cliffside Run* [Cliffside Run, point-to-point, clear turning to snow at 35 s]: **Calloway**, heir to the north coast, owns the road and the guard rail. Win it (P1).
6. *The Open Loop* [Kestrel Bay, rain turning to snow, Dante + the three bosses]: the Council meets at the Wall.

**The choice (event 6, before the race).** Dante offers a sponsorship (garage safe, pit crew, a season, the livery). Switch/Cain wants the Loop open to everyone.
- *Open the Loop to everyone* (`open`): Cain +2, Mara +1, Nova +1, Dante -2. Epilogue: crowds queue at the garage, Dante watches "politely".
- *Accept Redline's sponsorship* (`sponsor`): Dante +2, Brick +1, Mara -1, Cain -2. Epilogue: Redline Racing starts, Mara "proud, and does not like it".
Both lead to the same hook: Cain asks the Rookie to meet him at the lighthouse. The crash twelve years ago was not an accident.
Flags and relationships (`career.flags`, `career.rel`, -5..5) are saved; the Crew screen shows the relationship bars from Chapter 2 on.

**Characters in game.** 2D portraits with four expressions (neutral, smirk, angry, worried) in dialogue, the Crew screen and the
versus screen before every race; low-poly 3D figures (Mara by the garage car, rivals leaning on their cars at the grid, Dante at the finale).
Optional: Tripo GLBs for Dante and Mara (`public/models/characters/<id>.glb`) replace the procedural figures when present (loader hook is a TODO).

## Chapter 3: "Blood on the Wall" (implemented 2026-11-19, first pass)
Tagline: *The truth is in the road.* Opens after the Chapter 2 epilogue has been shown (`career.epilogueSeen`); the base story and the Legend unlock still end with Chapter 2 (`storyComplete`). Data: `src/data/story3.ts` (events, `CHAPTER_3`, `EPILOGUE_3`), dialogue `storyLines3.ts`, Spanish `i18n/esContentH.ts`, logic `core/career.ts` (`nextEvent3`, `chapter3Open`), test `tests/story3-check.mts`.
1. *The Lighthouse* [Coast Run, clear, Rook/Vex/Jinx, top two]: Cain shows the cut brake line; from now on he calls the corners on the radio.
2. *Cain's Gearbox* [Neon Strip, rain, manual gearbox FORCED (`manual: true`), top two]: Redline owns the lap sensors. Rivals change with the Chapter 2 flag (`open`: Nova, Brick; `sponsor`: Vex, Tank) and so do Nova's / Dante's lines.
3. *Night Shift* [Serpent Drift, rain, no rivals, 7,000 points]: the gate-house logbook has Calloway's name twice. Dante was the courier.
4. *The North Pass* [Mountain Pass, snow, Calloway + two, top two; unlocks the 535d]: Calloway admits his father cut the line to protect the road (he was nine).
5. *The Final Loop* [Coast Run, rain to snow at 70 s, Dante + Calloway + one, must win; unlocks the M3]. Before the race: the evidence choice. `public` (take it public: Cain +1, Mara +1, Dante -1) or `deal` (trade it to Dante: Dante +1, Cain -2); they exclude each other. Endings: *The Wall Remembers* (Cain drives one lap at dawn) / *The Quiet Wall* (Dante owns the Wall, black and gold).
NOT built from the outline below: the live "pace note" co-driver (Cain only speaks in dialogue and, with Subtitles on, race captions), the new short tracks (alley circuit, tram depot, rooftop car park: existing maps were used), the point-to-point dusk-to-dawn loop through all five districts (the final is two laps of Coast Run), the "Redline black and gold" livery for the `sponsor` branch.

## Cinematics (implemented 2026-11-19)
Six short cutscenes (16-22 s each) play in the showroom around the player's car, with letterbox bars, captions with the speaker's name (always visible, unlike race captions) and a Skip button. They play once (flag `cs:<id>`), before the pre-race dialogue, and can be replayed from Crew > Cinematics. In order: *Redline Rising* (chapter 2 opener, before `c2-redline`: Dante and Rook), *The Council* (before `c2-final`: Nova, Brick, Calloway and Dante around the car, Switch on the radio), *Blood on the Wall* (chapter 3 opener, before `c3-lighthouse`: Cain and Mara), *One Wall, One Truth* (before `c3-final`: Dante, Cain, Calloway), then the two Chapter 3 epilogues before the end card: *Dawn Lap* (flag `public`) and *The Quiet Wall* (flag `deal`). The Chapter 1 opening cinematic is the original race-start one (`camera/shots.ts`). Not built: cutscenes on real city locations (all take place on the showroom stage), voice acting, a Chapter 1 / Chapter 2 ending cutscene, per-character facial animation.

## Chapter 3 original outline (design notes)
- **Act 1, the lighthouse.** Cain reveals the proof: a brake line cut the night of the crash, and the dock gate log that places
  Dante at the quay. Cain cannot drive any more (his hands), so he rides along in the Rookie's radio: Switch becomes a co-driver
  who calls corners (a live "pace note" feature).
- **Act 2, short tracks.** The new Council holds short-circuit events across the city: tight alley circuits, a tram-depot night, a
  rooftop car park (vertical map). Each unlocks a piece of evidence. Branch: with `open` the districts help (Nova's crew, Brick's
  trucks); with `sponsor` the Rookie races in Redline black and gold and must decide when to betray the team.
- **Act 3, the Final Loop.** One long race through all five districts, point-to-point, dusk to dawn (weather cycles). Dante's last
  card: he did not cut the line, he *knew*. The truth is Calloway's father. Dante's endgame is to buy the Wall itself.
- **Endings.** Win clean (Cain returns to drive one lap, Switch goes silent for the first time); or win the dirty way (Dante keeps the
  Wall). Epilogue sets up Chapter 4 on the open road.

## New locations (round 9, 2026-11-15)
- **Mountain Pass (Kestrel Highlands).** The old supply road over the ridge behind Kestrel Bay: switchbacks, a rock tunnel and
  a lookout where the crews meet after midnight. Cain learned to drive here; Mara says the hairpins are "where he left his
  nerves". Story use: a Chapter 3 night run to the lookout, where Vex is waiting with an offer; snow events after the ridge.
- **Coast Run (Riviera Quarter).** South of the harbour, where the money lives: yachts, the casino square, the hotel hairpin,
  the cliff tunnel and the beach road. The sponsor branch of Chapter 2 (`sponsor` flag) leads here: a glamour exhibition race
  for a sponsor dinner, with DJ Switch calling it live from the esplanade. Dante's people watch from the casino terrace.
Both are free-race maps now; story events can point at them through `StoryEvent.trackId` (`mountain`, `coast`).


## Season 2 arc: the city opens (design 2026-11-23, extends chapters 1-3, nothing restarted)
Free Drive in Neon Harbor (docs/open-world.md) is the same city as the story: Kestrel Bay's harbour metropolis. Chapters 1-3 stay as shipped. This arc adds a **prologue**, **Chapters 4 and 5** and an **epilogue** that send the story out of the showroom and into the districts. Tone: night, neon, loyalty, rivalry; PG; crashes are cars, not people.

### Cast additions (the existing cast stays: Rookie, Mara, Dante, Switch/Cain, Jinx, Tank, Vex, Pixel, Lola, Rook, Nova, Brick, Calloway)
| Name | Role | Look (people system) | Voice / personality | Recurring spot |
|---|---|---|---|---|
| **Pip Okoro** | Navigator. Teenage map nerd who reads the city's one-way streets like code; becomes the GPS voice in missions | small, hoodie, headset, tablet | fast, funny, nervous before big races, never wrong about a street | the passenger seat; Mara's garage roof |
| **Wren** | Mysterious veteran. Drove with Cain twelve years ago; silent in public, speaks in short warnings | long coat, white-grey hair, driving gloves | dry, tired, kind underneath; never says the whole truth at once | the Old Town plaza at night; the Mountain Pass lookout |
| **Madame Adeyemi ("the Broker")** | Fixer. Hands out the city jobs (the Free Drive missions); sells to anyone | tailored coat, gold earring, phone always ringing | polite, transactional, "everything has a price and a deadline" | the Strip, under the biggest sign |
| **Pixel (grows)** | Street rookie from Chapter 1 who becomes a real rival, one level stronger each chapter | cap, mismatched gloves | cocky then respectful: "Teach me the line" | wherever the Loop races start |
Bios for the Crew screen are written in `docs/story.md` here and surfaced in-game by the existing Crew screen (a separate Characters codex screen is NOT built; see the round report).

### Prologue: "Before the Wall" (cutscene, ~20 s, no race)
Twelve years ago, dusk, the docks. Young Cain and Wren (in the passenger seat) test the Civic; Cain jokes that the street remembers. A phone call (Dante, young, polite) ends the scene. Switch narrates over the black: "Everyone remembers the crash. Nobody remembers the phone call."

### Chapter 4: "Neon Harbor" (the city is the map)
Tagline: *The whole city is the track.* Opens after the Chapter 3 epilogue. Goal: win the **city jobs** that Madame Adeyemi controls: Redline pays her to keep the Rookie off the streets. Escalation: each district's job board unlocks the next district.
1. *Downtown*: Pip joins as navigator (tutorial of GPS, speed traps). Job: courier to the car meet. Rival: Pixel (level 2).
2. *The Strip*: Adeyemi's first offer, and a ring race against Nova's crew (or Vex's, by the Chapter 2 flag). Speed-trap bonus ladder.
3. *Old Town*: Wren appears at the plaza and gives the Rookie half a map of the night of the crash. Twist: the cut brake line was a copy: someone staged it to look like Calloway's father's work.
4. *Harbour*: the drift pads; Dante's men are buying the cranes. Drift job (Serpent Drift rules), Brick's help or Tank's muscle by flag.
5. *Boss race, The Hills*: the skyline run against **Dante's champion driver** (a Redline pro, ruthless, uses a black-and-gold Supra). Win = Wren trusts you with the second half of the map. Unlocks: Evo upgrades stage 4.
Cutscenes: opening (Broker's neon sign), after the boss race (Wren on the rooftop above Old Town). Rewards: cash per job, M3 stage kit, Free Drive district unlocks.

### Chapter 5: "The Bay Bridge" (the long night)
Tagline: *One bridge. One truth.* Goal: reach the lighthouse archive and prove who staged the crash before Dante buys the Wall at dawn.
1. *Industrial*: top-speed run on the runway (speed-trap record), Pip finds the archive key.
2. *Mountain exit*: Mountain Pass night race with Wren riding along (he calls corners like Cain did).
3. *Coast exit*: Coast Run vs Calloway, now an ally if `public` was chosen in Chapter 3, still a rival if `deal`.
4. *Time trial across the Bay Bridge* in the weather of the player's choice (the story flag picks it).
5. *Showdown, Harbor Loop at dawn*: Dante himself, then Cain's lap (Cain drives the last mile of the Loop with the Rookie's car; the twist that **Wren staged the crash** to stop Dante's buyout of the Wall twelve years ago and let Cain "die" safely). Two outcomes by the Chapter 3 flags (`public`: the Wall stays open; `deal`: Redline black-and-gold livery, bitter ending).
Rewards: Legend rivals, all districts open.

### Epilogue: "What the Street Remembers"
Dawn over the bridge. Pip reads the final route aloud; Mara repaints the Red Hand Wall; Switch signs off: "Every street remembers who bled for it. Now it remembers you." Final card sets up the free-roam endgame (jobs and tokens stay).

### Status of this arc
2026-11-24: BUILT in the game: prologue "Before the Wall" (plays before Chapter 4), Chapter 4 "Neon Harbor" (`data/story4.ts`: the yard, the cranes, the cliff lodge, the Broker's Loop on four maps), Chapter 5 "The Bay Bridge" (`data/story5.ts`: the archive key, Wren rides along, the coast keys, the bridge, dawn on the Loop; Wren confesses he staged the crash; flag-based rivals and endings), recap cards, Madame Adeyemi and Wren (Speaker, look, Crew entries). Pip is not in the game (Pixel takes the navigator role). The text below is the original design, kept for reference.
Original status: Design only. Built so far in code: the Free Drive jobs (`data/world/missions.ts`, 5 reach jobs), tokens, city races. The chapter 4/5 events, cutscenes, codex screen and recap card are NOT built yet (they need `data/story4.ts` + `storyLines4.ts` + `esContentI` Spanish strings and tests; see docs/ui-story.md for the round status).
