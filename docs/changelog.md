# Changelog (for the owner, newest first)

Updated at every checkpoint. One short section per working day or session. Technical detail is in `docs/handoff.md` (Done) and `docs/skills.md`.

## 2026-11-20
- **Faster launches.** The game now downloads only what changed since last time (about 28 bytes when nothing did, instead of ~526 KB for a big save), and big saves are compressed both ways. The server part is already live; the browser part ships with the next deploy.
- **Documentation system.** This changelog, the owner's guide, the online/Redis roadmap and a ready-made prompt for the next big job. Rule: docs are updated after every change, and every session ends with a checkpoint.
- **Decisions:** no Redis yet; own lobby server later (see `docs/roadmap-online.md`).
- Git now works from the WSL terminal; everything so far is committed and pushed.

## 2026-11-19 (big day)
- **Story:** Chapter 3 "Blood on the Wall" (5 races, a final choice, 2 endings, a race where you must shift by hand). Six **cinematics** (chapter openers, the Council, the final confrontation, two endings), replayable from Crew. The opening narration is always shown.
- **Server storage:** your progress is saved in a MySQL database on your server, with a player code to move between devices. The old Percona cluster service was disabled.
- **Feedback and donations:** in-game message form (stored on the server, email attempted) and a "Support the game" tab with your IBAN.
- **Phone:** landscape only (with a "turn your phone" card), draggable buttons and presets (handbrake on the right), manual gas during the countdown for tilt players, no more text selection when you hold a button.
- **Modes and feel:** manual gearbox (E/Q, d-pad, phone + and -) with "perfect shift" nitro rewards; two curves-only drift maps (Drift Ring, Serpent Drift); quick tutorial with a language step; subtitles off by default.
- **Fixes:** infinite money from reloading a saved race (each race is paid once); Power Stage 4 could not be bought; Drift Night target lowered to 3,000 so it can be won; the white glare over cars at High graphics; over-bright tunnel and plaza neon; money format in Spanish; HUD hidden during cutscenes; ten event cards without Spanish.
- **Settings and menus:** Basic / Advanced tabs, Auto graphics and frame cap (starts at Medium on real GPUs, adjusts both ways), Unlock all cars back, cleaner garage and tuning screens.
- **Sound:** recorded engines pitched less shrill (per-car trim and filter, Evo darkest). Not heard by anyone yet.
- **Site:** deployed to https://notcarlos.mosidealus.nl (firewall ports 80/443 opened; before that it only worked from the company network).

## 2026-11-17 and 2026-11-18
- Renamed to **Neon Speed**. Online races (friends, room code). Snow grip closer to rain. Handbrake: lets go at once, long hold fades, W-key cornering fixes. Install-app button (Android and iPhone). Sound mix swap (music loud by default). Deep-house generative music. Performance round (fewer draw calls on phones, Auto quality). Fun round: style combo, 17 achievements. Neon Harbor open world: design and road generator started (not playable yet).

## 2026-11-14 to 2026-11-16
- First playable: cars, tracks, rain/snow physics, turbo, AI rivals, Story Chapter 1 and 2, tuning, save slots, Spanish, recorded engine sounds, phone controls (tilt, wheel, buttons), full-screen and PWA, people models and animation, new tracks Mountain Pass and Coast Run, three more cars (Golf, 535d, M3).
