import { qualityNow } from '../core/quality';
import { clamp, smoothstep } from '../core/math';
import type { RacerView } from '../game/racerViews';
import type { Weather } from '../types/game';
import type { ParticlePool } from './particles';
import type { SkidMarks } from './skidMarks';

/** Per-surface look of tyre clouds: colour, size, lift and how many per second at full slide. */
const LOOK: Record<Weather, { r: number; g: number; b: number; a: number; s0: number; s1: number; rise: number; rate: number; speedKick: number }> = {
  // owner (2026-11-15): smoke was too big and too shiny: smaller, greyer (stays under the bloom threshold), thinner
  CLEAR: { r: 0.6, g: 0.6, b: 0.64, a: 0.22, s0: 0.5, s1: 1.7, rise: 0.6, rate: 65, speedKick: 0.15 },
  RAIN: { r: 0.55, g: 0.63, b: 0.75, a: 0.24, s0: 0.35, s1: 1.3, rise: 2.0, rate: 85, speedKick: 0.45 }, // fine water spray, thrown up and back
  SNOW: { r: 0.66, g: 0.71, b: 0.8, a: 0.28, s0: 0.45, s1: 1.6, rise: 1.0, rate: 60, speedKick: 0.3 }, // powder kicked up
};

/** Smoke / water spray / snow powder from the tyres, and skid marks. Rates follow the quality tier. */
export class TyreFx {
  private readonly smoke: ParticlePool;
  private readonly skids: SkidMarks;
  private readonly last = new WeakMap<RacerView, Float32Array>();
  private readonly acc = new WeakMap<RacerView, number>();

  constructor(smoke: ParticlePool, skids: SkidMarks) {
    this.smoke = smoke;
    this.skids = skids;
  }

  /** How hard the tyres are sliding, 0..1: drift angle, wheelspin, handbrake, hard braking. */
  static slide(v: RacerView): number {
    const car = v.racer.car;
    const s = car.state;
    const speed = Math.abs(s.speed);
    let k = 0;
    if (speed > 4) k = Math.max(k, smoothstep(0.1, 0.45, Math.abs(s.slipAngle)));
    if (car.flags.wheelspin) k = Math.max(k, 0.7);
    if (car.flags.handbrake && speed > 6) k = Math.max(k, 1);
    if (car.flags.braking && speed > 14) k = Math.max(k, 0.45);
    return clamp(k, 0, 1);
  }

  update(v: RacerView, dt: number, weather: Weather, forcedSlide = 0): void {
    const k = Math.max(TyreFx.slide(v), forcedSlide);
    const look = LOOK[weather];
    const s = v.racer.car.state;
    let last = this.last.get(v);
    if (!last) this.last.set(v, (last = new Float32Array(5)));
    const sh = Math.sin(v.heading);
    const ch = Math.cos(v.heading);
    let emit = (this.acc.get(v) ?? 0) + k * look.rate * qualityNow().particles * dt;
    const wheels = v.visual.rearWheels;
    for (let i = 0; i < wheels.length; i++) {
      const lx = wheels[i].position.x;
      const lz = wheels[i].position.z;
      const wx = v.x + ch * lx + sh * lz;
      const wz = v.z - sh * lx + ch * lz;
      if (k > 0.2 && last[4] === 1) this.skids.add(last[i * 2], last[i * 2 + 1], wx, wz, clamp(k, 0, 1) * (weather === 'SNOW' ? 0.35 : weather === 'RAIN' ? 0.5 : 0.9));
      last[i * 2] = wx;
      last[i * 2 + 1] = wz;
      if (emit >= 1 && k > 0.1) {
        const n = Math.floor(emit / wheels.length) + 1;
        for (let j = 0; j < n; j++) {
          const spread = 1.2 + k;
          this.smoke.emit(
            wx, 0.15, wz,
            s.velocity.x * look.speedKick + (Math.random() - 0.5) * spread, look.rise + Math.random() * 0.9, s.velocity.z * look.speedKick + (Math.random() - 0.5) * spread,
            0.9 + Math.random() * 0.8, look.s0, look.s1 * (0.7 + k * 0.5), look.r, look.g, look.b, look.a * (0.55 + 0.45 * k),
          );
        }
      }
    }
    if (emit >= 1) emit = 0;
    this.acc.set(v, emit);
    last[4] = k > 0.2 ? 1 : 0;
  }
}
