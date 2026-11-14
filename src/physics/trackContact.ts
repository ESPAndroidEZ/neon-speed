import type { Track } from '../world/track';
import { createHit, locate, type TrackHit } from '../world/trackQuery';
import type { CarController } from './carController';

const HALF_W = 0.92; // car half width, m
const HALF_L = 2.1; // car half length (corner points), m
const RESTITUTION = 0.28;
const WALL_FRICTION = 0.1;
const MASS = 1300;
const INERTIA = 1900;
const VERGE_GRIP = 0.55;
const VERGE_DRAG = 0.5;
const CORNERS: readonly (readonly [number, number])[] = [
  [HALF_W, HALF_L], [-HALF_W, HALF_L], [HALF_W, -HALF_L], [-HALF_W, -HALF_L],
];

/**
 * Car vs track edges (pure, no allocation). Each step: find the track position, apply verge grip loss
 * outside the tarmac, and bounce the car off the barrier using its four corners.
 */
export class TrackContact {
  readonly hit: TrackHit = createHit();
  /** Closing speed of the latest wall hit (m/s), 0 when none. Read once per step by juice and audio. */
  impact = 0;
  /** World contact point of the latest hit. */
  readonly contact = { x: 0, z: 0 };
  offroad = false;
  private readonly corner: TrackHit = createHit();

  private readonly track: Track;

  constructor(track: Track) {
    this.track = track;
  }

  /** Teleport target: nearest sample to the car. */
  nearestIndex(car: CarController): number {
    return locate(this.track, car.state.position.x, car.state.position.z, -1, this.corner).index;
  }

  /** Put the car on the centre line of sample `index`, facing along the track, stopped. */
  place(car: CarController, index: number, lateral = 0): void {
    const n = this.track.samples.length;
    const s = this.track.samples[((index % n) + n) % n];
    const x = s.position.x + s.tangent.z * lateral;
    const z = s.position.z - s.tangent.x * lateral;
    car.reset(x, z, Math.atan2(s.tangent.x, s.tangent.z));
    this.hit.index = ((index % n) + n) % n;
  }

  update(car: CarController): void {
    const tr = this.track;
    const st = car.state;
    this.impact = 0;
    locate(tr, st.position.x, st.position.z, this.hit.index, this.hit);
    const lat = Math.abs(this.hit.lateral);
    this.offroad = lat > tr.halfWidth + 0.3;
    car.surfaceGrip = this.offroad ? VERGE_GRIP : 1;
    car.surfaceDrag = this.offroad ? VERGE_DRAG : 0;

    const sh = Math.sin(st.heading);
    const ch = Math.cos(st.heading);
    let worst = 0;
    let wx = 0;
    let wz = 0;
    let side = 1;
    for (let k = 0; k < 4; k++) {
      const cx = st.position.x + ch * CORNERS[k][0] + sh * CORNERS[k][1];
      const cz = st.position.z - sh * CORNERS[k][0] + ch * CORNERS[k][1];
      locate(tr, cx, cz, this.hit.index, this.corner);
      const pen = Math.abs(this.corner.lateral) - tr.barrierOffset;
      if (pen > worst) {
        worst = pen;
        wx = cx;
        wz = cz;
        side = this.corner.lateral > 0 ? 1 : -1;
      }
    }
    if (worst <= 0) return;

    // Inward normal = -side * leftNormal(tangent), leftNormal = (tz, -tx).
    const t = tr.samples[this.corner.index].tangent;
    const nx = -side * t.z;
    const nz = side * t.x;
    const vn = st.velocity.x * nx + st.velocity.z * nz;
    let dvx = 0;
    let dvz = 0;
    if (vn < 0) {
      const j = -(1 + RESTITUTION) * vn;
      const tx = st.velocity.x - vn * nx;
      const tz = st.velocity.z - vn * nz;
      const fr = Math.min(1, WALL_FRICTION * (1 + -vn * 0.15));
      dvx = j * nx - tx * fr;
      dvz = j * nz - tz * fr;
      this.impact = -vn;
      this.contact.x = wx;
      this.contact.z = wz;
    }
    // Yaw kick from the off-centre hit (arm x impulse), kept modest so walls never spin the car wildly.
    const armX = wx - st.position.x;
    const armZ = wz - st.position.z;
    const dr = Math.max(-1.5, Math.min(1.5, ((dvx * armZ - dvz * armX) * MASS) / INERTIA));
    car.nudge(nx * worst, nz * worst, dvx, dvz, dr);
    if (this.impact > 2) car.drift.breakChain();
  }
}
