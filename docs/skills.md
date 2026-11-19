# skills.md: how to work on Neon Speed without re-reading the code

For Claude and Qwen. Read this first, then `docs/handoff.md` (status), then `docs/code-map.md` (one line per file; regenerate with `npm run map`). Open a source file only after grep / the map told you which one. Updated 2026-11-19.

## 1. Mental model (5 lines)
- `src/main.ts` wires everything. `game/game.ts` (Game) owns the state machine MENU / CINEMATIC / RACING / PODIUM and the fixed 1/60 s loop; `core/raceManager.ts` runs racers; `physics/carController.ts` steps one car (legacy model in `physics/legacy`, v2 in `physics/v2`, both call `physics/drivetrain.ts`).
- Maps are DATA (`data/tracks/*.ts` TrackDef polygon with fillets) -> `buildTrack` -> `world/` builds meshes, `physics/` uses the same samples, the minimap draws them.
- UI is plain DOM layers (`ui/*`, classes `rb-layer`, `rb-panel`, `rb-row`; CSS in `ui/menuCss.ts`). Menus are in `ui/menu.ts`, settings in `ui/settings.ts` (Basic / Advanced tabs).
- Saves: `core/save.ts` (SaveStore, localStorage, versioned, `parseSave` in `saveParse.ts`), race snapshots `core/gameSave.ts` + `game/saveGame.ts`. No server, no database: every player's data lives in their browser. Online races are PeerJS peer to peer.
- Strings: `src/i18n/en*.ts` + `es*.ts`, typed keys, `t('key')`; long content uses `tx('English text')` with the Spanish in `esContent*.ts`.

## 2. Hard rules (the build enforces the first)
- Every `.ts` file < 220 lines (`scripts/check-lines.mjs`). At the limit now: `game/game.ts` 219, `core/raceManager.ts` 219, `ui/menu.ts` 219, `main.ts` 217. Do not add lines there: split or put new code in a new module and wire it with one line.
- No `enum` / `namespace` / constructor parameter properties; `import type` for types. No `three` in `src/physics`. Physics in fixed 1/60 steps. No allocation per frame or step (no closures or arrays in `update`/`step`; use methods and reused objects).
- Car space +Z nose, +X left, `steer > 0` is LEFT. Contracts: `src/types/game.ts` (change = architecture change, log it in handoff). Brands only in `data/cars.ts`.
- LOCKED (owner): the turbo model (drivetrain boost, `audio/turboSound`), approved rain/snow physics, STANDARD assist handling, handbrake carry/hold in `physics/legacy/stability`. Ask before touching.
- Money must be paid once per race: `Game.startRace` gives each race `meta.raceId`; `SaveStore.claimRace` (last 16 in `data.paid`) is checked in `game/story.ts finish`. Never bank cash elsewhere.

## 3. Where is X (feature -> files)
| I want to change | Look at |
|---|---|
| a setting (add / show) | `core/save.ts` type + default, `core/saveParse.ts`, `ui/settings.ts` (`applySettings`, Basic/Advanced panels), i18n en+es |
| quality / auto graphics / fps | `core/quality.ts` (TIERS, AutoQuality), `core/perfTier.ts`, `ui/autoTier.ts`, `ui/graphicsSettings.ts`, `core/graphics.ts` |
| touch buttons, layout editor | `ui/touchControls.ts`, `ui/touchButton.ts` (CSS), `ui/touchLayout.ts`, `ui/layoutEditor.ts`, prefs `input/controlPrefs.ts` (key `rb-controls`) |
| keyboard / gamepad / merge | `input/keyboard.ts`, `input/gamepad.ts`, `input/combinedInput.ts`, `input/keyBindings.ts` |
| manual gearbox | `physics/gearbox.ts` (flag), `physics/drivetrain.ts` (`manual`, `shift()`), shift inputs E/Q, d-pad, touch +/-; tests `manual-gearbox-check` |
| a track | `data/tracks/*.ts` + list in `data/tracks/index.ts` + palette in `data/palettes.ts` + ES blurb in `i18n/esContentC.ts` |
| story events, dialogue | `data/story1.ts`, `story2*.ts`, `storyLines*.ts`, canon in `docs/story.md`, flow `game/story.ts`, rules `core/career.ts` |
| cars, upgrades, prices | `data/cars.ts`, `carReal.ts` (real specs + power stages), `upgrades.ts`, `core/save.ts buyUpgrade` |
| engine / music / turbo sound | `audio/engineSamples.ts` (recorded loops, `samplePitch`), `data/engineSounds.ts` (`tune {trim,tone}` per car), `audio/engineVoice.ts` (synth), `audio/house*.ts` |
| lights, bloom, glare, neon | `render/lookConfig.ts`, `core/grade.ts`, `core/looks.ts`, `fx/finalFx.ts` (streak pass), `fx/headlights.ts`, `world/carLights.ts`, emissive strengths in `world/tunnelBridge.ts props.ts landmarks.ts` |
| menus / garage / tuning | `ui/menu.ts`, `ui/garage.ts` (+`garageLook`), `ui/tuneMenu.ts`, `ui/menuCss.ts` (all menu CSS) |
| phone orientation, launch gas | `ui/rotateHint.ts` (landscape card + lock), `ui/touchControls.ts` (`starting`, `startgas` pedal), `game/inputSetup.ts` |
| tutorial, subtitles | `ui/howToPlay.ts` (once, key `rb-howto`), `ui/subtitles.ts` (`SUBTITLES.on`, default off) |
| deploy to the server | section 6 |

## 4. Playbooks
- Add a setting: type + default in `core/save.ts` (the long `settings:` line), parse it in `core/saveParse.ts`, apply it in `applySettings` (`ui/settings.ts`), row in `ui/settings.ts` (Basic or Advanced) or `ui/drivingSettings.ts`, strings in `enMenu.ts` + `esMenu.ts`. Run `npx tsx tests/i18n-check.mts`.
- Add a string: key in BOTH `i18n/enX.ts` and `i18n/esX.ts` (typed `t()` keys; template keys need a literal array or a cast). Content text for `tx()`: add the Spanish to an `esContent*.ts`. `tests/i18n-check.mts` fails on any gap.
- Add a track (data only): copy `data/tracks/driftRing.ts`; vertices are corners `{x,z,r,zone,w}` (r = fillet, must fit half the legs: tangent length = r*tan(turn/2)); `type` circuit | sprint | drift (drift needs `driftTarget`); min length 1000 m (sprint 1800); register in `index.ts`, add a palette, add the ES blurb. Check: `npx tsx tests/tracks-check.mts`, `tests/city-check.mts`. Probe drift scores with the bots in `tests/lab/laps.mts` (copy it, read `car.drift.bank + car.drift.chain`).
- Add an input action: optional field on `CarInput` (contract), every source sets it, `CombinedInput` ORs it, consumed in `physics/legacy/legacyStep.ts` AND `physics/v2/v2Step.ts`.
- Add a touch button: create with `tag(holdButton(...), 'id')` in `ui/touchControls.ts`, add the id to `IDS` in `ui/touchLayout.ts`, CSS in `touchButton.ts`.
- Add a story event: data in `data/story*.ts` (target, rivals, weather), Spanish through `tx()`, update `docs/story.md`, `tests/career-check.mts`.
- Change money rules: only through `SaveStore` + `claimRace`; extend `tests/save-check.mts`.
- Qwen tasks: `docs/tasks/000-readme.md` (one small file per task, <100 lines). `/new-task` and `/review-qwen` skills.

## 5. Commands and checks (always through the quiet wrappers)
- `npm run build:q` (lines + health + tsc + vite) must be OK. `npm run test:q` (all unit tests; `grep -c "^FAIL" logs/last-test.txt` must be 0). `npm run visual:q` (night luminance, clipping, chroma: keep ALL PASS after any light/neon/bloom change). `npm run map` after adding files. Single test: `npx tsx tests/<name>.mts`.
- Never `cat` files; Read with offset/limit, Grep with `-n`, `wc -l` first.
- Browser checks: `npm run dev` (5173). Playwright needs libs unpacked without sudo: `apt-get download libnspr4 libnss3 libasound2t64`, `dpkg-deb -x` into a folder, `export LD_LIBRARY_PATH=<folder>/usr/lib/x86_64-linux-gnu`. Dev URL flags (`src/dev/devStart.ts`, `src/main.ts`): `?skip` (straight to a race), `track=<id>`, `w=clear|rain|snow`, `car=<id>`, `ai=<n rivals>`, `ff=<seconds>`, `at=<sample|zone>`, `screen=garage|tune|settings|crew|maps|story`, `probe`, `soak` (exposes `__rbScene`, `__rbRenderer`). `scripts/ui-shots.mjs` = menu screenshots; a four-view track sheet script pattern is in this session's notes (loop `at` over fractions of the sample count). The tutorial skips itself when `navigator.webdriver`.
- Do not trust headless SwiftShader for lighting alone: but the HIGH-tier glare was reproduced there and fixed (streak pass was unbounded; now capped per tap).

## 6. Server, deploy, git
- Live site: https://notcarlos.mosidealus.nl (docroot `/data/www/carlos.mosidealus.nl/public_html`, nginx vhost is Ansible-managed: never edit). Deploy: `tsh login` first (the session expires, error "cert has expired"), then `scripts/deploy-server.sh` (it logs in as `webdev@`; root also works). It wipes the docroot and unpacks `dist`.
- The server firewall (ufw) was closed to the public; ports 80/443 were opened 2026-11-18. If the site only works from the company network again, check `ufw status`.
- Database: none needed or used. Saves are localStorage. A DB (cloud saves, leaderboards) would also need an API service: out of scope until the owner asks. The server runs a MariaDB/Galera cluster (ufw has 3306/4567/4568/4444 open) but this game does not use it.
- Git: push after every block. This machine has no global git identity: commit with `git -c user.name=Carlos -c user.email=<owner email from earlier commits> commit`. Commit messages end with the Co-Authored-By line. Qwen branches `qwen/<task>` merge only through `/review-qwen`.

## 7. Known gotchas (cost me time once)
- CSS `hidden` is overridden by `display:grid/flex`: add `[hidden]{display:none!important}` (see `.rb-tabs`).
- Individual CSS `translate` / `scale` are used on touch buttons so the press `transform` still works.
- Typed i18n: `t(\`how.t${i}\`)` fails to compile; index a `as const` array instead.
- `Game.startRace` mutates `setup.meta` (raceId): do not reuse a meta object between races.
- Visual look bugs: bright HDR emissive (multiplier > 2) on long meshes washes out through bloom; keep strips near 1.2-1.6.
- `tests/save-roundtrip.mts` guards the rule "a restored race runs identically": new per-race state must be in the snapshot.

## 8. Open work (see handoff for the live list)
More story (docs/story.md is canon: add chapters there first), visual review of the remaining tracks in RAIN and SNOW (cliff, mountain, coast, drift maps), knockout mode, shift-timing scoring, qa-report rows 9-12, 22-27.
