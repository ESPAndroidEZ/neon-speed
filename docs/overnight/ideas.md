# Ideas for item 99 (self-directed)

Pick the highest-value one, do it, move it to "Done" with a date and commit hash. Add your own; prefer things players feel in the first five minutes.

## Backlog
- Race feel: speed lines and FOV kick tied to speed and nitro (never camera shake from plain acceleration), subtle motion blur, better start-line countdown with engine rev.
- Skid, gear-shift and nitro sound polish using only procedural audio; tyre screech varies with surface (asphalt, wet, snow).
- Rival banter on the radio during races, driven by position changes (overtakes, close finishes) and weather; short lines, EN + ES.
- Results screen: lap breakdown, best-lap ghost line, "what you could tune" hint from `data/upgradeAdvice.ts`.
- Photo mode in the garage and after races (hide HUD, free orbit, filters), saves a PNG download.
- Accessibility: colour-blind safe HUD palette option, text size options, reduced-flash option, remappable keys.
- Mobile: touch target audit, frame-time governor that lowers quality before dropping frames, battery-friendly 30 fps option.
- Tutorial: first race teaches throttle, braking line, handbrake and nitro with unobtrusive prompts that disappear once used.
- Replay of the last race from the save snapshot machinery (deterministic physics), cinematic cameras.
- Neon identity: animated neon sign title, city signage using the Neon Speed name and fictional brands, reflections in wet asphalt (keep `npm run visual` passing).
- Test and tooling: a headless bot lap per car that asserts lap-time bands, so tuning regressions show up in CI.

## Done
- 2026-11-16 Personal-best line on the free-race results: first run, new record with the gain, or best time plus gap (`pbNote` in `game/freeRace`, `RaceResult.note`, `tests/pb-note-check.mts`).
- 2026-11-16 Daily challenge on the main menu from a date seed (`data/dailyChallenge`, `ui/dailyButton`, `tests/daily-check.mts`); main menu scrolls on short phones.
- 2026-11-16 Results screen "what you could tune" hint: after a lost free race the results show one affordable upgrade and why it helps (`affordableTip` in `data/upgradeAdvice`, `ui/tuneTip`, `tests/tune-tip-check.mts`).
- 2026-11-16 First-races driving coach: gas, brake, nitro, handbrake hints that retire once used (`game/coachLogic`, `ui/coach`, `tests/coach-check.mts`).
