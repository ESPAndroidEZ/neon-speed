# Neon Speed: story and opening cinematic

Tagline: **"Every street remembers who bled for it."** Tone: neon-noir street racing. Loyalty, debt, a city that never sleeps. Rating PG (crashes are cars, not people).
Critique of the old story: `docs/story-review.md`. Text lives in `src/data/storyLines*.ts` (one block per beat); event metadata in `story1.ts`, `story2a.ts`, `story2b.ts`. Spanish is keyed by the English text (`src/i18n/esContentE..G`). Test: `tests/story-graph-check.mts`.

## Premise
**Kestrel Bay** is a port city that never fully dries out. When the container trade left, night races took over the empty quays: the **Harbor Loop**. Winners press a red hand on the **Red Hand Wall** at the finish line. Twelve years ago the Loop's first legend, **Cain Vega**, crashed at Quay 9 and vanished. Now **Redline Holdings** is buying the docks, the debt on Mara's garage and the Loop itself.

## The truth (what really happened, revealed in the final act)
Cain's brake line was cut on the quay before the race by a man in a grey coat with a gold gull cufflink: **Aldous Calloway**'s man (Calloway Sr. had money riding on the Loop and Cain was about to expose the fixing). Cain's protege **Dante**, twenty-one, had prepped the car and found the cut line afterwards. Calloway Sr. held his family's debt and Cain's. His price: silence. Dante kept the line, said nothing, and has spent twelve years buying the Loop so that no one can ever cut a line and walk away. His rules are his guilt. The East Yard key he gives the Rookie in Chapter 1 opens the lighthouse lockbox with the proof: he was handing the truth to the first driver who drove like Cain.

## Cast
- **The Rookie** (they/them, silent in cutscenes, a few lines). Want: save Mara's garage. Need: choose what the Loop becomes. Learned to drive from a pirate-radio voice, which is why Mara sees Cain in their hands.
- **Mara Vega**, mentor, phone calls. Practical, sarcastic, protective. Cain's sister. Hurt by his twelve years of silence; the arc is whether she forgives him.
- **DJ Switch** = **Cain Vega**. Pirate radio, warm and wry, uses Cain's sayings ("the road writes its name on you", planted in the first conversation). His hands cannot hold a wheel any more.
- **Dante Voss**, antagonist. Calm, formal, never contracts a sentence. Early lines read as menace, late lines as guilt ("a street without rules eventually kills someone"; the flowers at Quay 9; "Almost is what I collect").
- Rivals, each with a car and a reason to care: **Jinx** (Evo, rain; grew up in the flooded district), **Tank** (Supra, blocker; ten years of dock wages in the car), **Vex** (350Z, drifter; Redline pays for the tyres, and the leash), **Nova** (RX-7, drift queen; hates being paid to lose), **Brick** (Evo, dock union; never lifts, never lies), **Calloway Jr.** (Supra, Cliffside; entitled, lonely, slowly suspects his father). Street fillers: **Pixel** (streamer, hatchback), **Lola** (dock runner; saw the man in the grey coat at ten), **Rook** (ex-Redline; saw Dante carry something wrapped in a towel at dawn).
- The betrayal: Cain let Mara grieve for twelve years. She hangs up on him at the end of Chapter 1 and speaks to him only through the Rookie until the final act.

## Three acts (10 beats, ids fixed because saves and tests use them)
**Act 1: Wet Asphalt (Chapter 1, demo).**
1. `warmup` Warm-up Circuit (dry, Civic). COLD OPEN: the first launch plays the 11 s cinematic and drops straight into the race. Mara and Switch teach braking, the handbrake and nitro through timed in-race captions (`cues`). After the win: the "Previously in Kestrel Bay" cards (skippable, once), then the first conversation (Mara, the Civic, the debt, the Wall). Plants: "the road writes its name on you" (Switch) and "my brother used to say that" (Mara).
2. `dock` Dock Sprint (rain, Jinx). Unlocks the 350Z. Dante: the docks close Friday.
3. `drift` Drift Night (snow, drift score). Vex, the show, Dante's challenge.
4. `finale` Harbor Loop vs Dante (rain to snow). Dante gives the East Yard key ("Do not use it yet"). Switch reveals he is Cain; Mara hangs up. Unlocks the Supra.

**Act 2: Redline Rising (Chapter 2, four district votes plus one clue each).**
5. `c2-redline` roadblock night (Rook: Dante came in at dawn with something in a towel). Switch comes out on air.
6. `c2-neon` Neon Strip, Nova (flowers at Quay 9 every year). Unlocks the RX-7.
7. `c2-maze` Container Maze, Brick (the gate log vanished; Calloway's father signed for the lock). Unlocks the Evo.
8. `c2-yard` Yard Drift Night (drift). Lola tells what she saw at ten: the grey coat, the gull cufflink.
9. `c2-cliff` Cliffside Run, Calloway Jr. ("my father sounded afraid").

**Act 3: the Council and the lighthouse.**
10. `c2-final` The Open Loop. Calloway calls twice to say take the sponsorship. The CHOICE (flags `open` / `sponsor`, mutually exclusive), then the race, then the lighthouse: the key opens the lockbox (cut brake line, torn gate log, Dante's note). Dante confesses; the Calloway name lands.

## The branch (visible differences)
| | `open` | `sponsor` |
|---|---|---|
| Choice reply | Nova and Brick join in | Nova and Brick walk away |
| Final field | Dante, Calloway, Nova, Brick | Dante, Calloway, Vex, Tank (`rivalsIf`) |
| In-race captions | Switch: Pixel is streaming, the street is with you | Switch: black and gold in the mirrors |
| Lighthouse | Pixel streams it live, Switch names Aldous Calloway, Calloway Jr. brings the lawyers, Dante sells the docks back for a hand on the Wall, Mara forgives Cain, Cain asks for one lap | Dante keeps the Loop and buries the proof for safety; Cain: "you bought the Wall with my brake line"; Mara is proud and not okay; Switch keeps listening |
| Ending card | **The Open Loop**, credits "NEON SPEED / Kestrel Bay keeps the lights on." | **Redline Racing**, credits "NEON SPEED / Some doors you choose twice." |
Crew screen bios change after the ending (`truth` field); relationships (`rel`) are saved as before.

## Dialogue system notes
- Every event has `before`, `afterWin`, `afterLose` plus `loseAlt` (2 more sets): repeated failures rotate through three different lines (tries are per session).
- Lines can read **context flags** supplied at play time (`StoryController.view`): `car-<id>` (civic, golf, 350z, rx7, e61, m3, evo, supra), `tier-0..3`, `replay` (event already passed), `retry` (failed this session), plus the saved story flags (`open`, `sponsor`). Use `if:` / `unless:` on a line.
- `cues` are timed captions (seconds after the countdown starts), optionally flag-gated.
- Dante's key, flags, relationships and `cardsSeen` live in the save (`career.flags`); old saves load unchanged.

## Opening cinematic: timecoded script
Runs 11.5 s and maps onto the four shots in `src/camera/shots.ts`. Tap skips to the whip. The first launch goes straight from here into the warm-up race.

| Time | Shot | On screen / action | Audio |
|------|------|--------------------|-------|
| 0.0 - 2.2 | Front low sweep | Black. Rain hiss, then a hard cut to the headlights | Rain, idle rumble. **Switch:** "Kestrel Bay. Two a.m." |
| 2.2 - 4.2 | Wheel flyby | Tracking down the flank, tyre spray, neon on the paint | **Switch:** "The rain doesn't wash anything clean here." |
| 4.2 - 8.4 | 360 orbit | Full reveal. Lower-third: *Honda Civic, "The Beater"* | **Switch:** "Redline runs the Loop. Dante runs Redline." / "And Mara's garage is three days from the bank." |
| 8.4 - 10.8 | Rear crane reveal | Title **NEON SPEED** fades in at 9.4 | **Switch:** "So tonight... you drive." |
| 10.8 - 11.5 | Whip into chase cam | FOV kick, tagline, countdown | Whoosh, countdown beeps, gameplay music |

## Race intro cards (Switch)
Warm-up: "Warm-up lap. Don't embarrass yourself." Dock Sprint: "Wet road, short fuse. Brake earlier than you think." Drift Night: "First snow. Sideways is the only way." Finale: "Last race. Last chance. Bring everything."

## Chapter 1 and 2 events as implemented
| # | Event | Conditions | Objective | Reward |
|---|-------|-----------|-----------|--------|
| 1 | Warm-up Circuit | dry, 2 laps, Civic only, vs Pixel, Lola, Rook | top 2 | $1,500 |
| 2 | Dock Sprint | rain, 2 laps, vs Jinx, Tank, Rook, Pixel | top 2 | $3,000, **350Z** |
| 3 | Drift Night | snow, 3 laps, no rivals | 6,000 drift points | points / 3 + $4,000 |
| 4 | Harbor Loop vs Dante | rain to snow at 75 s, 3 laps, vs Vex, Jinx, Tank, Dante | win | $8,000, **Supra** |
| 5 | Redline Rising | Kestrel Bay, dry, vs Rook, Vex, Jinx | top 2 | $4,000 |
| 6 | Neon Night | Neon Strip, rain, 3 laps, vs Nova, Pixel, Lola, Vex | top 2 | $6,000, **RX-7** |
| 7 | Container Maze | snow, 4 laps, vs Brick, Tank, Rook, Jinx | top 2 | $7,000, **Evo** |
| 8 | Yard Drift Night | Container Drift, rain, no rivals | 12,000 points | $6,000 |
| 9 | Cliffside Run | point-to-point, clear to snow at 35 s, vs Calloway, Nova, Jinx | win | $10,000 |
| 10 | The Open Loop | Kestrel Bay, rain to snow at 90 s; field depends on the choice | top 2 | $12,000 |
Chapter 2 tagline: *Four districts. Four votes. One street.*

## Characters in game
2D portraits with four expressions (neutral, smirk, angry, worried) in dialogue, the Crew screen and the versus screen; low-poly 3D figures (Mara by the garage car, rivals at the grid, Dante at the finale). Optional Tripo GLBs for Dante and Mara replace the procedural figures when present.

## After the ending
The story is complete in ten beats. Open threads for a future Chapter 3 (not built): Calloway Jr. and the trial, the Mountain Pass lookout (Vex's offer), the Coast Run glamour exhibition (sponsor branch), and a Cain-as-co-driver pace-note feature.

## Locations added later (round 9, 2026-11-15)
- **Mountain Pass (Kestrel Highlands):** the old supply road over the ridge; Cain learned to drive here ("where he left his nerves").
- **Coast Run (Riviera Quarter):** yachts, the casino square, the hotel hairpin; the sponsor branch leads here. Dante's people watch from the casino terrace.
Both are free-race maps; story events can use them through `StoryEvent.trackId` (`mountain`, `coast`).
