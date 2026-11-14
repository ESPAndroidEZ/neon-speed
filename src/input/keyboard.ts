import { clamp } from '../core/math';
import type { CarInput, InputSource } from '../types/game';

const STEER_RISE = 5.5; // per second toward the pressed direction
const STEER_RETURN = 9; // per second back to centre when released
const STEER_CROSS = 14; // per second when reversing direction

/** WASD / arrows, Space handbrake, Shift nitro. Steering ramps so taps are gentle and holds reach full lock. */
export class KeyboardInput implements InputSource {
  private readonly down = new Set<string>();
  private steer = 0;
  private last = performance.now();

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

  constructor() {
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
    const left = this.any('KeyA', 'ArrowLeft');
    const right = this.any('KeyD', 'ArrowRight');
    const want = (left ? 1 : 0) - (right ? 1 : 0);
    let rate = STEER_RETURN;
    if (want !== 0) rate = Math.sign(want) !== Math.sign(this.steer) && this.steer !== 0 ? STEER_CROSS : STEER_RISE;
    const diff = want - this.steer;
    this.steer += clamp(diff, -rate * dt, rate * dt);
    out.steer = this.steer;
    out.throttle = this.any('KeyW', 'ArrowUp') ? 1 : 0;
    out.brake = this.any('KeyS', 'ArrowDown') ? 1 : 0;
    out.handbrake = this.down.has('Space');
    out.nitro = this.any('ShiftLeft', 'ShiftRight');
    return out;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
