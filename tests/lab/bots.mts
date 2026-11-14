import { clamp, wrapAngle } from '../../src/core/math.ts';
import { createRng } from '../../src/core/rng.ts';
import { SteerRamp } from '../../src/input/steerRamp.ts';
import { marginFor, racingLine, speedProfile, type RacingLine } from '../../src/physics/aiLine.ts';
import type { CarController } from '../../src/physics/carController.ts';
import type { CarInput } from '../../src/types/game.ts';
import type { Track } from '../../src/world/track.ts';

/** Stand-ins for human players. `clean` has an analog stick and looks ahead; `keyboard` only has keys (bang-bang through
 * the real key ramp, 0.1 s reactions); `clumsy` reacts late, overdrives corners, saws at the keys and stabs the handbrake. */
export type BotKind = 'clean' | 'keyboard' | 'clumsy';
export const BOTS: readonly BotKind[] = ['clean', 'keyboard', 'clumsy'];

interface Style { analog: boolean; skill: number; delay: number; dead: number; look: number; lift: number; hb: number; /** Slide angle (rad) at which the driver lifts off the gas. */ scare: number }
const STYLES: Record<BotKind, Style> = {
  clean: { analog: true, skill: 0.8, delay: 0, dead: 0, look: 0.5, lift: 0.5, hb: 0, scare: 0.3 },
  keyboard: { analog: false, skill: 0.84, delay: 6, dead: 0.035, look: 0.45, lift: 1.5, hb: 0, scare: 0.4 },
  clumsy: { analog: false, skill: 0.98, delay: 14, dead: 0.07, look: 0.33, lift: 4, hb: 0.012, scare: 0.75 },
};

export class Bot {
  readonly out: CarInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
  private readonly st: Style;
  private readonly line: RacingLine;
  private readonly v: Float32Array;
  private readonly ramp = new SteerRamp();
  private readonly rnd: () => number;
  // delayed decisions (ring buffers): wanted steer key, throttle, brake
  private readonly qs = new Float32Array(32);
  private readonly qt = new Float32Array(32);
  private readonly qb = new Float32Array(32);
  private k = 0;
  private hbLeft = 0;

  constructor(kind: BotKind, track: Track, car: CarController, grip: number, seed = 1) {
    this.st = STYLES[kind];
    this.rnd = createRng(seed * 7919 + kind.length);
    this.line = racingLine(track.samples, marginFor(grip));
    this.v = new Float32Array(this.line.n);
    const mu = Math.min(car.t.gripFront, car.t.gripRear) * grip;
    speedProfile(this.line, { aLat: 9.81 * mu * this.st.skill, aBrake: 7.5 * grip * this.st.skill, aAccel: 4.5, vMax: 80 }, this.v);
  }

  /** `index` is the car's track sample; returns the input for this step. */
  decide(dt: number, car: CarController, index: number): CarInput {
    const { st, line, out } = this;
    const s = car.state;
    const sp = Math.abs(s.speed);
    const ahead = Math.round((5 + st.look * sp) / line.ds);
    const j = (index + ahead) % line.n;
    const err = wrapAngle(Math.atan2(line.x[j] - s.position.x, line.z[j] - s.position.z) - s.heading);
    const target = this.v[(index + Math.round((2 + sp * 0.25) / line.ds)) % line.n];
    let wantSteer: number;
    let thr: number;
    let brk: number;
    if (st.analog) {
      wantSteer = clamp(err * 2.6, -1, 1);
      thr = clamp((target - sp) * 0.5 + 0.3, 0, 1);
      brk = clamp((sp - target - st.lift) * 0.4, 0, 1);
    } else {
      wantSteer = err > st.dead ? 1 : err < -st.dead ? -1 : 0;
      thr = sp < target + st.lift * 0.5 ? 1 : 0;
      brk = sp > target + st.lift ? 1 : 0;
    }
    if (Math.abs(s.slipAngle) > st.scare && sp > 8) thr = 0; // a human lifts when the tail is out
    if (sp < 4 && Math.abs(err) > 1.4) { thr = 0; brk = 1; wantSteer = -Math.sign(err); } // pointing the wrong way: back up
    const n = this.qs.length;
    const w = this.k % n;
    this.qs[w] = wantSteer; this.qt[w] = thr; this.qb[w] = brk;
    const r = (this.k - st.delay + n * 4) % n;
    this.k++;
    out.steer = st.analog ? wantSteer : this.ramp.update(this.qs[r], sp * 3.6, dt);
    out.throttle = this.qt[r];
    out.brake = this.qb[r];
    if (st.hb > 0 && this.hbLeft <= 0 && sp > 14 && Math.abs(err) > 0.12 && this.rnd() < st.hb) this.hbLeft = 0.25 + this.rnd() * 0.3;
    this.hbLeft -= dt;
    out.handbrake = this.hbLeft > 0;
    return out;
  }
}
