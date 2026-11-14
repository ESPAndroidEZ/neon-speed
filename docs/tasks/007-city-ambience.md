# Task 007: city ambience (procedural audio)
Files: src/audio/cityAmbience.ts
Branch: qwen/007-city-ambience
Contract (read-only): none. Uses `AudioBus` from src/audio/audioBus.ts (read it first: `ctx`, `sfx`, `noise`, `loopNoise()`).

## Export exactly
```ts
export class CityAmbience {
  constructor(bus: AudioBus);
  /** Call once per display frame. wetness 0..1 (rain), indoors true inside the tunnel (muffles everything). */
  update(dt: number, wetness: number, indoors: boolean): void;
  dispose(): void;
}
```

## Behaviour
- Everything is synthesised with Web Audio nodes (no files). Connect to `bus.sfx`.
- Low distant city rumble: `loopNoise()` through a lowpass at 180 Hz, gain 0.05.
- Random one-shots scheduled from `update` using a seeded PRNG (mulberry32, seed 1234) so the pattern is repeatable: a ship horn (two sine oscillators 110 and 165 Hz, 1.6 s, slow attack and release, gain 0.05) every 25 to 50 s; a far police siren (a sine sweeping 650 to 950 Hz and back, 3 s, through a bandpass, gain 0.025) every 40 to 80 s; a distant dog-bark-like noise burst is NOT wanted.
- Water lapping: noise through a bandpass at 500 Hz with a slow LFO on the gain (0.2 Hz), gain 0.03.
- `wetness` raises a gentle drip layer: short high noise ticks at random 0.05 to 0.3 s intervals with gain proportional to wetness.
- `indoors` lowers a master lowpass (22000 Hz outdoors, 700 Hz in the tunnel) with a 0.3 s time constant.
- All nodes created in the constructor except one-shots; one-shots stop themselves. `dispose()` stops and disconnects everything.

## Done when
`npm run build` passes, the file is under 220 lines, only the listed file changed.
