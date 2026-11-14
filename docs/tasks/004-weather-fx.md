# Task 004: weather FX (rain streaks, snow flakes)
Files: src/world/weatherFx.ts
Branch: qwen/004-weather-fx
Contract (read-only): `WeatherProfile`, `Disposable` in src/types/game.ts. Three.js is available.

## Export exactly
```ts
export interface WeatherFx extends Disposable {
  /** Call once per display frame. Particles live in a box around `camera`. */
  update(frameDt: number, camera: PerspectiveCamera): void;
  /** Switch look and density from the profile (rain streaks, snow flakes, or none). */
  setProfile(p: WeatherProfile): void;
}
export function createWeatherFx(scene: Scene): WeatherFx;
```

## Behaviour
- One `LineSegments` for rain, one `Points` for snow, each with a single fixed-size BufferGeometry created up front (rain 3000 streaks, snow 2500 flakes). No allocation in `update`.
- Particles fill a box 40 m wide, 25 m tall, 40 m deep centred on the camera and wrap around it as the camera moves (modulo on the position relative to the camera). The camera moves fast (up to 80 m/s) so wrapping must be seamless.
- Rain: streaks 0.6 m long, fall at 22 m/s, slight slant. Colour 0x9fb8ff, transparent, opacity 0.35. Snow: flakes fall at 1.8 m/s with a gentle sine sway, size 0.12, colour white, opacity 0.8.
- `precipitation` (0..1) scales how many particles draw (`geometry.setDrawRange`). `name === 'CLEAR'` hides both objects.
- Materials: `depthWrite: false`, `fog: true`, additive blending for rain only. The scene is dark with bloom: keep colours below HDR 1.0.
- `dispose()` removes objects from the scene and disposes geometry and materials.
- Do not touch other files: the architect calls `setProfile` from `Game.setWeather` and `update` from the frame loop.

## Done when
`npm run build` passes, the file is under 220 lines, only the listed file changed.
