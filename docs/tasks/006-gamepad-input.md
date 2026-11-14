# Task 006: gamepad input
Files: src/input/gamepad.ts
Branch: qwen/006-gamepad-input
Contract (read-only): `InputSource`, `CarInput` in src/types/game.ts. Reference: src/input/keyboard.ts.

## Export exactly
```ts
export class GamepadInput implements InputSource {
  constructor();
  /** True when a pad is connected (so the architect can show a hint). */
  get connected(): boolean;
  sample(out: CarInput): CarInput;
  dispose(): void;
}
```

## Behaviour
- Standard mapping (`gamepad.mapping === 'standard'`), first connected pad. Poll with `navigator.getGamepads()` inside `sample` (no events needed for state; use `gamepadconnected` / `gamepaddisconnected` only to track `connected`).
- Steering: left stick X, dead zone 0.12, rescaled so the dead zone edge maps to 0, then smoothed. REMEMBER `steer > 0` is LEFT, and stick X > 0 is right, so `steer = -x`.
- Throttle: right trigger (button 7 `.value`). Brake / reverse: left trigger (button 6 `.value`). Handbrake: button 0 (A / cross) or button 2 (X / square). Nitro: button 5 (right bumper) or button 1 (B / circle).
- Output ranges: throttle and brake 0..1, steer -1..1. When no pad is connected, write a neutral input.
- No allocation in `sample`. `dispose()` removes listeners. Must not throw if `navigator.getGamepads` is missing (return neutral).

## Done when
`npm run build` passes, the file is under 220 lines, only the listed file changed.
