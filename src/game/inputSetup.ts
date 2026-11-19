import { DemoInput } from '../dev/demoInput';
import type { Engine } from '../core/engine';
import { CombinedInput } from '../input/combinedInput';
import { GamepadInput } from '../input/gamepad';
import { PadMenu } from '../input/padMenu';
import { KeyboardInput } from '../input/keyboard';
import { KeyBindings } from '../input/keyBindings';
import { createTouchControls } from '../ui/touchControls';
import { ControlStore } from '../input/controlPrefs';
import { TiltInput } from '../input/tiltInput';
import { chooseControls, controlsTutorial, enableTilt } from '../ui/controlsOnboard';
import { isPhone } from '../core/quality';
import { showHowTo } from '../ui/howToPlay';
import { installNoSelect } from '../ui/noSelect';
import { GEARBOX } from '../physics/gearbox';
import { ImpactHaptic } from '../input/impactHaptic';
import { buzz } from '../ui/haptics';
import type { Game } from './game';

export interface Controls {
  /** Hand this to the Game; sources are keyboard, gamepad and touch merged (or the dev demo pilot). */
  input: CombinedInput | DemoInput;
  pad: GamepadInput;
  touch: ReturnType<typeof createTouchControls>;
  /** Phone control prefs (scheme, auto gas, tilt calibration), saved on their own key. */
  prefs: ControlStore;
  /** Remappable keyboard keys (own storage key). */
  bindings: KeyBindings;
  tilt: TiltInput;
  /** Wire what needs the Game: speed-sensitive keyboard steering and gamepad rumble on impacts. Call once the Game exists. */
  attach(engine: Engine, game: Game): void;
  /** First-run chooser (touch devices, once). */
  onboard(): void;
}

/** All input devices in one place. `pause` and `reset` are what the pad's Start and Y and the touch buttons do. */
export function createControls(demo: string | null, actions: { pause: () => void; reset: () => void }, kv: Storage | null): Controls {
  installNoSelect();
  const touch = createTouchControls(document.body, { onReset: actions.reset, onPause: actions.pause });
  const bindings = new KeyBindings(kv);
  const keys = new KeyboardInput(bindings);
  const pad = new GamepadInput({ onPause: actions.pause, onReset: actions.reset });
  const prefs = new ControlStore(kv);
  const tilt = new TiltInput(prefs);
  const input = demo !== null ? new DemoInput(demo) : new CombinedInput([keys, pad, touch, tilt]);
  const apply = (): void => {
    touch.setScheme(prefs.data);
    tilt.active = prefs.data.scheme === 'tilt';
  };
  prefs.onChange(apply);
  apply();
  if (prefs.data.scheme === 'tilt' && isPhone()) {
    tilt.listen(); // Android: no prompt needed
    const again = (): void => {
      window.removeEventListener('pointerup', again, true);
      if (!tilt.receiving) void enableTilt(prefs, tilt, false); // iOS asks again from the first tap of the session
    };
    window.addEventListener('pointerup', again, true);
  }
  return {
    input, pad, touch, prefs, tilt, bindings,
    onboard: () => {
      if (isPhone() && !prefs.data.chosen) chooseControls(prefs, tilt);
      showHowTo(false); // once per device, over the control chooser
    },
    attach: (engine, game) => {
      let was = game.state;
      const padMenu = new PadMenu(); // gamepad drives the menus (not while racing: A is the handbrake)
      engine.onFrame((_a, dt) => {
        padMenu.update(dt, game.paused || game.state !== 'RACING');
        touch.starting = game.state === 'RACING' && game.rm.phase !== 'RACING'; // grid + 3-2-1: manual gas for the launch
        game.rm.player.car.drivetrain.manual = GEARBOX.manual; // the driver's own car only; rivals always shift by themselves
        keys.speedKph = game.telemetry.speedKph;
        tilt.speedKph = touch.speedKph = Math.abs(game.telemetry.speedKph);
        if (game.state === 'RACING' && was !== 'RACING' && isPhone()) controlsTutorial(prefs);
        was = game.state;
      });
      const base = game.onImpact;
      const haptic = new ImpactHaptic();
      game.onImpact = (s) => {
        base?.(s);
        pad.rumble(Math.min(1, s / 18), Math.min(1, s / 10), 0.25);
        const p = pad.rumbleOn && isPhone() ? haptic.pulse(s, performance.now()) : null; // phones: the same Rumble setting
        if (p) buzz(p.ms, p.strong);
      };
    },
  };
}
