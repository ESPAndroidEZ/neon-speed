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
- 2026-11-16 Start-line rev: gas flat during the countdown winds the engine up, smooth fall to real rpm at GO (`audio/launchRev`, `tests/launch-rev-check.mts`).
- 2026-11-16 Lap time pop-up: "LAP n  m:ss.cc ±x.xx" at each lap end vs your best (`game/lapPop`, `game/ghost`, `tests/lap-pop-check.mts`).
- 2026-11-16 Speed units: km/h or mph in Settings for the gauge, garage and tuning screens (`game/speedUnit`, `ui/unitsRow`, `tests/speed-unit-check.mts`).
- 2026-11-16 Live delta to your best lap: "BEST ±x.x" under the gap tags, from the stored ghost lap (`ghostDelta` in `game/ghostData`, `ui/gapTags`, `tests/ghost-check.mts`).
- 2026-11-16 Gap tags: seconds to the rival just ahead (red, +) and just behind (green, −) under lap/position (`game/gapLogic`, `ui/gapTags`, `tests/gap-check.mts`).
- 2026-11-16 Gamepad menu navigation: d-pad or left stick moves focus, A presses, B goes back, left/right steps sliders and the garage car picker; only outside races (`input/padNavLogic`, `input/padMenu`, `tests/pad-nav-check.mts`).
- 2026-11-16 Wrong-way warning: red banner after 1.2 s of fast driving against the road (with the R hint on keyboards), clears once turned around (`game/wrongWayLogic`, `ui/wrongWay`, `tests/wrong-way-check.mts`).
- 2026-11-16 Settings from the pause menu: volume, camera shake, keys, accessibility and the rest can be changed mid-race; the screen opens over the pause menu, Back or Esc closes it (`PauseHandlers.settings`, `Menu.settingsPanel`).
- 2026-11-16 Driver record: lifetime races, wins, podiums, DNFs, laps, time raced, cash won and best drift on the Crew screen, kept under its own localStorage key `ns.stats` (`game/driverStats`, `ui/statsCard`, `tests/driver-stats-check.mts`).
- 2026-11-16 Results lap breakdown: every lap time listed under the best lap (fastest in green) when a race has more than one lap (`Racer.lapTimes`, `RaceResult.lapTimes`, snapshot field optional, `tests/race-check.mts`).
- 2026-11-16 Remappable keyboard keys: gas, brake, left, right, handbrake, nitro in Settings (desktop), swap on conflict, reserved keys refused, coach hints show the bound key (`input/keyBindings`, `ui/keyRemap`, `tests/key-bindings-check.mts`).
- 2026-11-16 Colour-blind safe HUD setting: good/bad (green/red) become blue/orange through the theme tokens (`ui/colorSafe`, `settings.colorSafe`, `tests/save-check.mts`).
- 2026-11-16 Photo mode in the pause menu: clean-frame PNG download (`ui/photo`, `tests/photo-check.mts`).
- 2026-11-16 Calm HUD accessibility setting: stops the limiter shift-light flash, title flicker, brake-hint pulse, nitro/pop bursts and speed lines (`ui/calm`, `settings.calmUi`, row in the driving settings, `tests/save-check.mts`).
- 2026-11-16 Personal-best line on the free-race results: first run, new record with the gain, or best time plus gap (`pbNote` in `game/freeRace`, `RaceResult.note`, `tests/pb-note-check.mts`).
- 2026-11-16 Daily challenge on the main menu from a date seed (`data/dailyChallenge`, `ui/dailyButton`, `tests/daily-check.mts`); main menu scrolls on short phones.
- 2026-11-16 Results screen "what you could tune" hint: after a lost free race the results show one affordable upgrade and why it helps (`affordableTip` in `data/upgradeAdvice`, `ui/tuneTip`, `tests/tune-tip-check.mts`).
- 2026-11-16 First-races driving coach: gas, brake, nitro, handbrake hints that retire once used (`game/coachLogic`, `ui/coach`, `tests/coach-check.mts`).
