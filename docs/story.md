# Racer's Blood: story and opening cinematic

Tagline: **"Every street remembers who bled for it."**

## World

Kestrel Bay, a port city that never fully dries out: rain on the cranes, neon on the wet asphalt, and a first snow coming. Street racing runs after midnight on the **Kestrel Bay Streets** circuit (a tight 1.4 km street course: Main Street, a canal bridge, a plaza hairpin, the dock strip, alleys and a tunnel), nicknamed the **Harbor Loop** and controlled by the Redline crew.

## Cast

- **You (the Rookie).** New in town, silent, drives a beaten-up used Civic.
- **Mara.** Owns Gearhead Garage, your mentor. Appears as phone calls. Her garage is three days from foreclosure.
- **Dante Voss.** Leader of Redline. Calm, polite, ruthless. Redline money is buying the street block by block.
- **DJ Switch.** Pirate radio voice of the city. Narrates the cinematic and the race intros. Cheap to produce (text or a few voice lines) and gives the city a personality.

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
| 8.4 - 10.8 | Rear crane reveal | Camera rises, the road and city skyline open up. Title **RACER'S BLOOD** fades in at 9.4 | Rev builds, synth sting. **Switch:** "So tonight... you drive." |
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
| 1 | Warm-up Circuit | dry, 2 laps, Civic only, vs Tank, Pixel, Lola | top 2 | race cash + $1,500 |
| 2 | Dock Sprint | rain, 2 laps, vs Lola, Rook, Pixel, Tank | top 2 | race cash + $3,000, **350Z unlocked** |
| 3 | Drift Night | snow, 3 laps, no rivals | bank 6,000 drift points | points / 3 + $4,000 |
| 4 | Harbor Loop vs Dante | rain turning to snow after 75 s, 3 laps, vs Kilo, Vex, Dante | win | race cash + $8,000, **Supra unlocked** |

Mara phones before and after events, Dante taunts before the Dock Sprint, after Drift Night and twice before the finale (a cutscene with his Supra on show). After the finale: Dante's key line, then the end card *Chapter 2: Short Tracks* with a feedback-link placeholder. The opening cinematic runs the first time with the five DJ Switch captions, the lower-third and the title from the script above. Optional browser speech reads Switch's lines (Settings: Switch voice, default off).
