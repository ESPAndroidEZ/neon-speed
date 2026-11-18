# 12 Procedural house music (menu + race)

No downloads, no samples, no network: generate the music in WebAudio. Start from `src/audio/music.ts`, `musicPatterns.ts`, `bed.ts`, `audioBus.ts` (there is already a music bus, patterns and an ambience "bed"). Read what exists before replacing anything; improve rather than duplicate.

Target: a convincing, danceable, night-drive house sound at 118-126 BPM that loops without feeling repetitive, mixed to sit UNDER the engine and never mask it.

Sub-checklist:
- [ ] Sequencer: sample-accurate scheduling (lookahead scheduler on the AudioContext clock, not setInterval timing for notes), swing, 16-step patterns, bar/section structure (intro, build, drop, break, outro, 32 to 64 bars), seeded random so a given seed is deterministic and testable.
- [ ] Voices (all synthesized, no allocation in the scheduler's hot loop where avoidable): four-on-the-floor kick (pitch-swept sine plus click), off-beat open hat, closed-hat 16ths with velocity, clap/snare layered noise, a rolling sidechain-pumped bass (saw/square + sub with filter envelope), chord stabs (minor 7ths, detuned saws through a lowpass with envelope), a lead/arp with delay, riser and noise sweep before drops, subtle vinyl/room reverb via a generated impulse response.
- [ ] Sidechain "pump": music gain ducks on every kick; additionally duck the whole music bus slightly with engine load/speed so the engine stays clear, and duck more under dialogue/radio lines.
- [ ] Moods: `menu` (calmer, filtered, no drop), `race` (full energy, intensity rises with position pressure and the final lap), `rain/snow` (darker filter, longer reverb), `garage` (lo-fi, half-time feel), `cinematic/story` (pads and sparse). Cross-fade on the bar line, no clicks.
- [ ] Several keys/progressions and seeds so different races sound different; a pool of at least 6 progressions and 4 drum/bass groove variations, chosen by seed.
- [ ] Settings: music volume and an on/off already exist or add them in the existing audio settings; save through the existing settings path. Respect the master 35 % default, the limiter and the autoplay policy (start after first user gesture).
- [ ] Mobile: cap polyphony and use a single shared noise buffer; no GC spikes. The scheduler must be cheap (target under 1 ms per tick); document how you measured.
- [ ] Test `tests/music-check.mts`: render a few bars offline with `OfflineAudioContext` if available in the test environment, otherwise test the pure pattern generator (determinism per seed, note ranges, kicks on every beat, section lengths), and assert no NaN / no gain above 1.0 on the music bus.
- [ ] Credits: add a line to `docs/audio-credits.md` saying music is procedural and original.

Done when: music plays in menu and race without errors in the browser console (use the smoke/e2e scripts to check no exceptions), loudness is sane relative to the engine (use `scripts/audio-level.mjs` if applicable), build and tests green, and the report says how to listen (which menu, which setting).
