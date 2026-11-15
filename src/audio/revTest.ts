/**
 * Garage "Sound test": a simulated rev run for any car (no driving, no purchase). Hold = throttle: rpm climbs from
 * idle, shifts at 97 % of the redline (rpm falls to ~62 %), and in the last gear bounces on the limiter. Release =
 * revs fall, with a blow-off (turbo cars) and an exhaust pop. Pure state, read by AudioManager each frame.
 */
export interface RevSample { rpm: number; load: number; boost: number; cut: boolean; shift: boolean; lift: boolean }

export class RevTest {
  carId: string | null = null;
  holding = false;
  rpm = 900;
  boost = 0;
  private gear = 1;
  private cutT = 0;
  private wasHolding = false;
  private readonly out: RevSample = { rpm: 900, load: 0, boost: 0, cut: false, shift: false, lift: false };

  start(carId: string): void {
    this.carId = carId; this.holding = false; this.rpm = 900; this.boost = 0; this.gear = 1; this.cutT = 0; this.wasHolding = false;
  }

  stop(): void {
    this.carId = null;
    this.holding = false;
  }

  /** idle/redline from the car's tuning; turbo = it has one. */
  update(dt: number, idle: number, redline: number, turbo: boolean): RevSample {
    const o = this.out;
    o.shift = false;
    o.lift = this.wasHolding && !this.holding;
    this.wasHolding = this.holding;
    o.cut = false;
    if (this.holding) {
      const climb = (redline - idle) / (0.9 + 0.35 * this.gear); // later gears climb slower
      this.rpm += climb * dt;
      if (this.rpm >= redline * 0.97 && this.gear < 4) { this.gear++; this.rpm = redline * 0.62; o.shift = true; }
      else if (this.rpm >= redline) { this.cutT += dt; this.rpm = redline - 250 * (0.5 + 0.5 * Math.sin(this.cutT * 40)); o.cut = Math.sin(this.cutT * 40) > 0; }
      this.boost = turbo ? Math.min(1, this.boost + dt * 0.9) : 0;
    } else {
      this.rpm = Math.max(idle, this.rpm - (redline * 0.9) * dt);
      this.boost = Math.max(0, this.boost - dt * 3);
      if (this.rpm <= idle * 1.05) this.gear = 1;
    }
    if (!Number.isFinite(this.rpm)) this.rpm = idle;
    o.rpm = this.rpm;
    o.load = this.holding ? 1 : 0;
    o.boost = this.boost;
    return o;
  }
}

/** One shared rev test: the garage starts/stops it, AudioManager plays it. */
export const REV_TEST = new RevTest();
