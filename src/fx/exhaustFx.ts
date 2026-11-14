import { qualityNow } from '../core/quality';
import type { RacerView } from '../game/racerViews';
import { EV_BACKFIRE, EV_UPSHIFT, EventReader } from '../physics/driveEvents';
import type { ParticlePool } from './particles';

/** Nitro flame cone and exhaust backfire flames (on lift-off, decel pops and upshifts) from the drivetrain's events. */
export class ExhaustFx {
  private readonly flames: ParticlePool;
  private readonly readers = new WeakMap<RacerView, EventReader>();
  /** Set by the dev showcase to fire everything regardless of driving. */
  forceNitro = false;

  constructor(flames: ParticlePool) {
    this.flames = flames;
  }

  update(v: RacerView, dt: number): void {
    const dtn = v.racer.car.drivetrain;
    const s = v.racer.car.state;
    const sh = Math.sin(v.heading);
    const ch = Math.cos(v.heading);
    const q = qualityNow().particles;
    if (dtn.nitroActive || this.forceNitro) {
      for (const e of v.visual.exhaust) {
        const wx = v.x + ch * e.position.x + sh * e.position.z;
        const wz = v.z - sh * e.position.x + ch * e.position.z;
        const n = Math.max(1, Math.round(dt * 160 * q));
        for (let i = 0; i < n; i++) {
          // a cone: slight random spread that opens with distance (faster particles fly further)
          const sp = 9 + Math.random() * 9;
          const sx = (Math.random() - 0.5) * 2.2;
          const sy = (Math.random() - 0.3) * 1.4;
          this.flames.emit(wx, e.position.y, wz, s.velocity.x - sh * sp + ch * sx, sy, s.velocity.z - ch * sp - sh * sx, 0.2 + Math.random() * 0.18, 0.8, 0.15, 0.5, 0.9, 3.4, 1);
          this.flames.emit(wx, e.position.y, wz, s.velocity.x - sh * sp * 0.55 + ch * sx * 0.5, sy * 0.6, s.velocity.z - ch * sp * 0.55 - sh * sx * 0.5, 0.14, 0.55, 0.08, 3.6, 1.5, 0.35, 0.9);
        }
      }
    }
    let r = this.readers.get(v);
    if (!r) this.readers.set(v, (r = new EventReader()));
    dtn.events.drain((type, value) => {
      if (type !== EV_BACKFIRE && type !== EV_UPSHIFT) return;
      if (type === EV_UPSHIFT && value < 0.3 && dtn.rpm < 4000) return;
      const strength = type === EV_UPSHIFT ? 0.55 : value;
      for (const e of v.visual.exhaust) {
        const wx = v.x + ch * e.position.x + sh * e.position.z;
        const wz = v.z - sh * e.position.x + ch * e.position.z;
        const n = Math.round((6 + strength * 14) * q);
        for (let i = 0; i < n; i++) {
          const sp = 6 + Math.random() * 10 * strength;
          this.flames.emit(wx, e.position.y, wz, s.velocity.x - sh * sp + (Math.random() - 0.5) * 3, Math.random() * 2, s.velocity.z - ch * sp + (Math.random() - 0.5) * 3, 0.12 + Math.random() * 0.14, 0.6 * (0.6 + strength), 0.1, 3.8, 1.8, 0.4, 1);
        }
      }
    }, r);
  }
}
