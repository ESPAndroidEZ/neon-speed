import type { CarInput, InputSource } from '../types/game';
import { createNeutralInput } from '../types/game';

/** Merges several sources (keyboard, gamepad, touch): the strongest value wins, buttons are OR-ed. No per-call allocation. */
export class CombinedInput implements InputSource {
  private readonly scratch: CarInput = createNeutralInput();
  private readonly sources: readonly InputSource[];

  constructor(sources: readonly InputSource[]) {
    this.sources = sources;
  }

  sample(out: CarInput): CarInput {
    out.throttle = 0;
    out.brake = 0;
    out.steer = 0;
    out.handbrake = false;
    out.nitro = false;
    const s = this.scratch;
    for (let i = 0; i < this.sources.length; i++) {
      this.sources[i].sample(s);
      if (s.throttle > out.throttle) out.throttle = s.throttle;
      if (s.brake > out.brake) out.brake = s.brake;
      if (Math.abs(s.steer) > Math.abs(out.steer)) out.steer = s.steer;
      if (s.handbrake) out.handbrake = true;
      if (s.nitro) out.nitro = true;
    }
    return out;
  }

  dispose(): void {
    for (const s of this.sources) s.dispose();
  }
}
