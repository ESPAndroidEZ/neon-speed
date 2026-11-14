# Task 003: touch controls
Files: src/ui/touchControls.ts
Branch: qwen/003-touch-controls
Contract (read-only): `InputSource`, `CarInput` in src/types/game.ts

## Export exactly
```ts
export function createTouchControls(container: HTMLElement): InputSource;
```

## Behaviour
- A DOM overlay appended to `container`, inline styles only, no CSS files. Use Pointer Events with multi-touch (steering and buttons are used at the same time).
- Left half of the screen: drag-anywhere virtual stick. Horizontal drag drives `steer` (+1 is LEFT), smoothed.
- Right side: round buttons for brake, handbrake and nitro. Throttle is held by default (auto-gas) and released while braking.
- Respect safe areas with `env(safe-area-inset-*)`. Set `touch-action: none`, disable text selection and the iOS callout.
- Show the overlay only on touch devices (`matchMedia('(pointer: coarse)').matches`). On desktop it stays hidden and `sample` returns neutral input.
- `sample(out)` writes into `out` and returns it. No allocation.
- `dispose()` removes all DOM and listeners.

## Done when
`npm run build` passes, the file is under 220 lines (split into `src/ui/touchControls.ts` plus a helper file only if needed and list it on the Files line), only listed files changed.
