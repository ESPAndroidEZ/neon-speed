import { qualityNow } from '../core/quality';
import type { RacerView } from '../game/racerViews';
import { EV_BACKFIRE, EV_UPSHIFT, EventReader } from '../physics/driveEvents';
import type { ParticlePool } from './particles';

/** Nitro particles per second per exhaust (before the quality tier's particle scale). */
const NITRO_RATE = 70;

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
        const n = Math.max(1, Math.round(dt * NITRO_RATE * q));
        for (let i = 0; i < n; i++) {
          // a short cone: deep blue-violet at the nozzle into an orange tail. Additive, so colours stay below the bloom
          // knee and the plume is short enough never to reach the chase camera (it used to stack into a white-out).
          const sp = 5 + Math.random() * 5;
          const sx = (Math.random() - 0.5) * 1.4;
          const sy = (Math.random() - 0.3) * 0.8;
          this.flames.emit(wx, e.position.y, wz, s.velocity.x - sh * sp + ch * sx, sy, s.velocity.z - ch * sp - sh * sx, 0.14 + Math.random() * 0.1, 0.42, 0.1, 0.8, 0.34, 0.06, 0.35);
          this.flames.emit(wx, e.position.y, wz, s.velocity.x - sh * sp * 0.4 + ch * sx * 0.4, sy * 0.5, s.velocity.z - ch * sp * 0.4 - sh * sx * 0.4, 0.1, 0.32, 0.08, 0.32, 0.12, 0.8, 0.5);
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
          this.flames.emit(wx, e.position.y, wz, s.velocity.x - sh * sp + (Math.random() - 0.5) * 3, Math.random() * 2, s.velocity.z - ch * sp + (Math.random() - 0.5) * 3, 0.12 + Math.random() * 0.14, 0.6 * (0.6 + strength), 0.1, 0.85, 0.4, 0.09, 0.8);
        }
      }
    }, r);
  }
}
