# Task 003: touch controls
Files: src/ui/touchControls.ts
Branch: qwen/003-touch-controls
Contract (read-only): `InputSource`, `CarInput` in src/types/game.ts

## Export exactly
```ts
export interface TouchControls extends InputSource {
  /** Show or hide the overlay (the architect hides it in menus). */
  setVisible(v: boolean): void;
}
export function createTouchControls(container: HTMLElement, opts?: { onReset?: () => void; onPause?: () => void }): TouchControls;
```

## Context (final code)
`InputSource.sample(out: CarInput)` is called once per fixed step by `src/game/game.ts`; `steer > 0` is LEFT. The keyboard version is `src/input/keyboard.ts` (read it for the steering ramp). The architect wires the result into `main.ts` after review.

## Behaviour
- A DOM overlay appended to `container`, inline styles only, no CSS files. Use Pointer Events with multi-touch (steering and buttons are used at the same time). The overlay root has `pointer-events: none`; only the stick zone and the buttons receive events, so the HUD and menus underneath are never blocked.
- Left half of the screen: drag-anywhere virtual stick. Horizontal drag drives `steer` (+1 is LEFT), smoothed (reach full lock at 70 px of drag).
- Right side: round buttons for brake, handbrake and nitro, plus two small buttons: reset (calls `opts.onReset`) and pause (calls `opts.onPause`; the architect wires it to the same pause menu Esc opens). Throttle is held by default (auto-gas) and released while braking.
- Respect safe areas with `env(safe-area-inset-*)`. Set `touch-action: none`, disable text selection and the iOS callout.
- Show the overlay only on touch devices (`matchMedia('(pointer: coarse)').matches`). On desktop it stays hidden and `sample` returns neutral input.
- `sample(out)` writes into `out` and returns it. No allocation.
- `dispose()` removes all DOM and listeners.

## Done when
`npm run build` passes, the file is under 220 lines (split into `src/ui/touchControls.ts` plus a helper file only if needed and list it on the Files line), only listed files changed.
