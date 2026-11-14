import type { CarInput, InputSource } from '../types/game';

/**
 * Dev only (`?demo`): drives itself in swinging slides so effects can be checked without a keyboard.
 * `?demo=straight`: full throttle, no steering, no nitro (a clean run for the visual check).
 */
export class DemoInput implements InputSource {
  private t = 0;
  private readonly straight: boolean;

  constructor(straight = false) {
    this.straight = straight;
  }

  sample(out: CarInput): CarInput {
    this.t += 1 / 60;
    out.throttle = 1;
    out.brake = 0;
    out.steer = this.straight ? 0 : Math.sin(this.t * 0.9) * 0.9;
    out.handbrake = !this.straight && Math.sin(this.t * 0.9) > 0.8;
    out.nitro = !this.straight && this.t > 3;
    return out;
  }

  dispose(): void {}
}
