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
export function createTouchControls(container: HTMLElement, opts?: { onReset?: () => void }): TouchControls;
```

## Behaviour
- A DOM overlay appended to `container`, inline styles only, no CSS files. Use Pointer Events with multi-touch (steering and buttons are used at the same time). The overlay root has `pointer-events: none`; only the stick zone and the buttons receive events, so the HUD and menus underneath are never blocked.
- Left half of the screen: drag-anywhere virtual stick. Horizontal drag drives `steer` (+1 is LEFT), smoothed (reach full lock at 70 px of drag).
- Right side: round buttons for brake, handbrake and nitro, plus a small reset button that calls `opts.onReset`. Throttle is held by default (auto-gas) and released while braking.
- Respect safe areas with `env(safe-area-inset-*)`. Set `touch-action: none`, disable text selection and the iOS callout.
- Show the overlay only on touch devices (`matchMedia('(pointer: coarse)').matches`). On desktop it stays hidden and `sample` returns neutral input.
- `sample(out)` writes into `out` and returns it. No allocation.
- `dispose()` removes all DOM and listeners.

## Done when
`npm run build` passes, the file is under 220 lines (split into `src/ui/touchControls.ts` plus a helper file only if needed and list it on the Files line), only listed files changed.
