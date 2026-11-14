import type { CarInput, InputSource } from '../types/game';

/** Dev only (`?demo`): drives itself in swinging slides so effects can be checked without a keyboard. */
export class DemoInput implements InputSource {
  private t = 0;

  sample(out: CarInput): CarInput {
    this.t += 1 / 60;
    out.throttle = 1;
    out.brake = 0;
    out.steer = Math.sin(this.t * 0.9) * 0.9;
    out.handbrake = Math.sin(this.t * 0.9) > 0.8;
    out.nitro = this.t > 3;
    return out;
  }

  dispose(): void {}
}
