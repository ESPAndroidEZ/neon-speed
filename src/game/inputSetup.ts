import { DemoInput } from '../dev/demoInput';
import type { Engine } from '../core/engine';
import { CombinedInput } from '../input/combinedInput';
import { GamepadInput } from '../input/gamepad';
import { KeyboardInput } from '../input/keyboard';
import { createTouchControls } from '../ui/touchControls';
import type { Game } from './game';

export interface Controls {
  /** Hand this to the Game; sources are keyboard, gamepad and touch merged (or the dev demo pilot). */
  input: CombinedInput | DemoInput;
  pad: GamepadInput;
  touch: ReturnType<typeof createTouchControls>;
  /** Wire what needs the Game: speed-sensitive keyboard steering and gamepad rumble on impacts. Call once the Game exists. */
  attach(engine: Engine, game: Game): void;
}

/** All input devices in one place. `pause` and `reset` are what the pad's Start and Y and the touch buttons do. */
export function createControls(demo: string | null, actions: { pause: () => void; reset: () => void }): Controls {
  const touch = createTouchControls(document.body, { onReset: actions.reset, onPause: actions.pause });
  const keys = new KeyboardInput();
  const pad = new GamepadInput({ onPause: actions.pause, onReset: actions.reset });
  const input = demo !== null ? new DemoInput(demo === 'straight') : new CombinedInput([keys, pad, touch]);
  return {
    input, pad, touch,
    attach: (engine, game) => {
      engine.onFrame(() => {
        keys.speedKph = game.telemetry.speedKph;
      });
      const base = game.onImpact;
      game.onImpact = (s) => {
        base?.(s);
        pad.rumble(Math.min(1, s / 18), Math.min(1, s / 10), 0.25);
      };
    },
  };
}
