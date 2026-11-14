# Task 009: minimap
Files: src/ui/minimap.ts
Branch: qwen/009-minimap
Contract (read-only): `TrackSample`, `CarState`, `Disposable` in src/types/game.ts

## Export exactly
```ts
export interface Minimap extends Disposable {
  /** Call once per display frame. `racers[playerIndex]` is drawn bigger and in magenta. */
  update(racers: readonly CarState[], playerIndex: number): void;
  setVisible(v: boolean): void;
}
export function createMinimap(parent: HTMLElement, track: readonly TrackSample[]): Minimap;
```

## Behaviour
- One `<canvas>` appended to `parent`, fixed to the bottom-left corner, size `clamp(120px, 18vw, 190px)` square, `pointer-events: none`, margin `max(16px, env(safe-area-inset-left))`, semi-transparent dark rounded background, `z-index: 5`.
- Draw the track outline ONCE into an offscreen canvas at construction: fit the bounding box of `track` (x/z world metres) into the square with 10% padding, keeping aspect ratio. World +x maps to screen right, world +z maps to screen DOWN. Stroke width 3 px, colour `#18d8ff` at 70% alpha. Mark the start line (sample 0) with a short white bar across the track.
- `update` blits the offscreen outline, then draws one dot per racer from `position.x/z`: radius 3 px (player 5 px, magenta `#ff2a9d`, others white). No allocation per call (reuse scalars; no arrays or closures created inside `update`). Skip drawing when hidden.
- Handle `devicePixelRatio` for a crisp canvas. `dispose()` removes the canvas.

## Done when
`npm run build` passes, the file is under 220 lines, only the listed file changed. (The architect wires it into `main.ts` after review.)
