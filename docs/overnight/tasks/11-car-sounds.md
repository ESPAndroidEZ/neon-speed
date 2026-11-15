# 11 Every car gets its own engine sound (good ones)

Cars (8): Civic, Golf IV GTI, 350Z, RX-7, 535d Touring (E61), M3 (E46), Evo VIII, Supra.
Real character to aim for (procedural, not samples):
- Civic: high-revving small NA four, VTEC-style crossover around 5.5-6k: thin, buzzy, then a harder edge above the crossover.
- Golf GTI: turbo four, muted drone, small whoosh. Turbo audio stays as is (LOCKED).
- 350Z: NA V6, throaty and rough, a little exhaust boom, mid-pitched.
- RX-7: rotary, smooth rising "brap" buzz, almost no pulse roughness, very high redline, sequential twin turbo (turbo LOCKED).
- 535d: diesel straight-six twin turbo, clatter and low-rev rumble, 5200 rpm limit, little top end.
- M3 E46: NA straight-six, the best-sounding: sharp intake howl, smooth, high redline (~8k).
- Evo VIII: turbocharged four, rough idle, anti-lag-like chatter on lift, aggressive.
- Supra: 2JZ-style twin-turbo straight-six, smooth and deep with a strong turbo layer (LOCKED).

Start by reading `docs/code-map.md` (audio), `src/audio/engineVoice.ts`, `engineDsp.ts`, `audioParams.ts`, `rivalEngines.ts`, `src/data/engineSounds.ts` and the garage "Sound test (hold)" (`audio/revTest.ts`). Find what is per-car today and what is shared.

Sub-checklist:
- [ ] A per-car `EngineVoiceSpec` in data (cylinders and firing order/pulse irregularity, harmonic mix, formant/resonator frequencies, intake vs exhaust balance, idle roughness and lope, rev limiter style, redline, crossover, mechanical noise like valve/injector whine or diesel clatter). It is data, not code branches.
- [ ] The DSP in `audio/` consumes the spec without per-frame allocation; AudioWorklet engine with oscillator fallback must both honour it. Keep every file < 220 lines (split `engineDsp` if needed).
- [ ] Voicing presets (Smooth / Raspy / Aggressive, in the K panel) still work: they modify the car spec, they do not replace it.
- [ ] Rival cars in a race use their own car's voice, with distance attenuation/doppler as already implemented.
- [ ] Exhaust extras: decel pops/crackle for the Evo and 350Z, backfire on nitro, tasteful (and quiet enough not to fatigue). Never touch `audio/turboSound` or the `AUDIO` turbo defaults.
- [ ] A test `tests/engine-voices-check.mts`: render each car's voice offline (the project already has `scripts/audio-level.mjs` and `tests/engine-sound-check`; extend them) and assert (a) fundamentals follow rpm, (b) loudness is within a band for all cars, no clipping, (c) the spectral centroid at 3000 rpm differs between every pair of cars by a minimum margin so no two cars sound alike, (d) the diesel has the lowest top-end and the Civic/M3/RX-7 the highest.
- [ ] Garage "Sound test (hold)" works for every car and is the way Carlos will listen in the morning; list in the report how to hear each car (menu path) and the numbers from the test.

Done when: the test passes, build and tests green, the report lists a one-line description of each car's voice and its measured spectral centroid.
