import { clamp } from '../core/math';
import type { CarInput, InputSource } from '../types/game';

// Steering ramps depend on speed: quick and decisive when slow (hairpins, parking), softer at speed (no twitching on a straight).
const RISE_SLOW = 8; // per second toward the pressed direction
const RISE_FAST = 3.4;
const RETURN_SLOW = 10; // per second back to centre when released
const RETURN_FAST = 6.5;
const CROSS_SLOW = 16; // per second when reversing direction
const CROSS_FAST = 9;
const FAST_KPH = 180;

/** WASD / arrows, Space handbrake, Shift nitro. Steering ramps so taps are gentle and holds reach full lock. */
export class KeyboardInput implements InputSource {
  private readonly down = new Set<string>();
  private steer = 0;
  /** Car speed in km/h, set each frame by the game: the ramps soften as it rises. */
  speedKph = 0;
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
    const k = clamp(this.speedKph / FAST_KPH, 0, 1);
    let rate = RETURN_SLOW + (RETURN_FAST - RETURN_SLOW) * k;
    if (want !== 0) rate = Math.sign(want) !== Math.sign(this.steer) && this.steer !== 0 ? CROSS_SLOW + (CROSS_FAST - CROSS_SLOW) * k : RISE_SLOW + (RISE_FAST - RISE_SLOW) * k;
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
