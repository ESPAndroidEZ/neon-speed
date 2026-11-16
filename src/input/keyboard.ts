import { SteerRamp } from './steerRamp';
import type { CarInput, InputSource } from '../types/game';
import { DEFAULT_KEYS, KeyBindings } from './keyBindings';

/** WASD / arrows, Space handbrake, Shift nitro (all remappable except the arrows). Steering ramps so taps are gentle and holds reach full lock. */
export class KeyboardInput implements InputSource {
  private readonly down = new Set<string>();
  private readonly ramp = new SteerRamp();
  /** Car speed in km/h, set each frame by the game: the ramps soften as it rises. */
  speedKph = 0;
  private last = performance.now();
  private readonly keys: KeyBindings;

  private readonly onDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    this.down.add(e.code);
  };
  private readonly onUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };
  private readonly onBlur = (): void => {
    this.down.clear();
  };

  constructor(keys?: KeyBindings) {
    this.keys = keys ?? new KeyBindings(null);
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }

  private any(a: string, b: string): boolean {
    return this.down.has(a) || this.down.has(b);
  }

  sample(out: CarInput): CarInput {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const k = this.keys.codes;
    const left = this.any(k.left, 'ArrowLeft');
    const right = this.any(k.right, 'ArrowRight');
    const want = (left ? 1 : 0) - (right ? 1 : 0);
    out.steer = this.ramp.update(want, this.speedKph, dt);
    out.throttle = this.any(k.gas, 'ArrowUp') ? 1 : 0;
    out.brake = this.any(k.brake, 'ArrowDown') ? 1 : 0;
    out.handbrake = this.down.has(k.handbrake);
    out.nitro = this.down.has(k.nitro) || (k.nitro === DEFAULT_KEYS.nitro && this.down.has('ShiftRight'));
    return out;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
