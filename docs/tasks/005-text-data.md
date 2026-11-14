# Task 005: text data (radio lines, tips, crew bios)
Files: src/data/radio.ts src/data/tips.ts src/data/bios.ts
Branch: qwen/005-text-data
Contract (read-only): none. Data only: typed constants, no logic, no imports except `import type`. Do not edit any other file.

## What exists (read it first)
- `src/data/radio.ts` exports `RADIO` used by `src/game/radio.ts` (read that file to see the placeholders). KEEP THE EXACT SHAPE and add to it; do not rename keys. Existing keys: `start, overtake, overtaken, crash, drift, weather {RAIN, SNOW, CLEAR}, lap, finalLap, leading, last, idle, rival {name: string[]}`.
- `src/data/lore.ts` has `TIPS` (12 strings) and `CREW` (`CrewEntry[]`, interface defined there). Do not edit lore.ts; the architect will switch the imports after review.

## Write
1. `radio.ts`: about 80 DJ Switch lines in total. Switch is a pirate-radio voice: dry, warm, a little sarcastic, PG, never insults the player. Placeholders allowed: `{name}` rival name, `{pos}` `{n}` position and field size, `{lap}` `{laps}`, `{score}` drift points. Target counts: overtake 8, overtaken 8, crash 8, drift 8 (each must contain `{score}`), weather.RAIN 4, weather.SNOW 4, weather.CLEAR 2, lap 4, finalLap 4, leading 4, last 4, idle 6, plus two NEW keys `win` (6 lines, race won) and `lose` (6 lines, finished badly), plus `rival` lines for these exact names: `Jinx` (Evo, aggressive rain specialist), `Tank` (Supra, heavy), `Vex` (350Z, drifter), `Dante Voss` (black and gold RX-7, calm, ruthless, owns Redline Holdings), `Pixel`, `Lola`, `Rook`: 3 lines each, each containing the name. Keep every line under 90 characters. No line may be duplicated. Add `win` and `lose` to the exported object literal; keep the existing `as Record<string, string[]>` on `rival`.
2. `tips.ts`: `export const TIPS: string[]` with exactly 30 loading-screen tips: 12 about the lore (Kestrel Bay port city, the Harbor Loop, the Red Hand Wall at the finish line: winners press a red hand on it, Cain Vega the vanished first legend, Mara Vega's Gearhead Garage, Dante Voss and Redline Holdings buying the docks, DJ Switch's pirate radio from a crane cab; NEVER reveal that Switch is Cain) and 18 about driving (handbrake flicks, drift charges nitro, brake early in rain, puddles float the front tyres, snow banks drag the car, ice in the tunnel and on the bridge in snow, turbo spool and blow-off, lift off before corners, use the whole street, reset with R, pause with Esc). Each under 110 characters.
3. `bios.ts`: `import type { CrewEntry } from './lore';` then `export const CREW_BIOS: CrewEntry[]` with the same ids and shape as `CREW` in lore.ts (rookie, mara, cain, dante, switch, jinx, tank, vex) plus three more: `pixel`, `lola`, `rook`. Each `bio` 1 to 2 sentences, each `revealed` (only for `cain` and `switch`) 1 sentence: Cain never left and DJ Switch is Cain Vega. Colours as hex numbers.

## Done when
`npm run build` passes, each file under 220 lines, only the three files changed.
