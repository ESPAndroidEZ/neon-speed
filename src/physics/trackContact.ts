import { halfWidthAt, type Track } from '../world/track';
import { createHit, locate, type TrackHit } from '../world/trackQuery';
import type { CarController } from './carController';
import type { ObstacleField } from './obstacles';
import { createSurfaceHit, type SurfaceHit, type SurfaceMap } from './surfaces';

const HALF_W = 0.92; // car half width, m
const HALF_L = 2.1; // car half length (corner points), m
const RESTITUTION = 0.28;
const WALL_MU = 0.4; // Coulomb: rubbing drag follows how hard the car presses on the wall, so a gentle scrape slides on
const MASS = 1300;
const INERTIA = 1900;
const VERGE_GRIP = 0.6;
const VERGE_DRAG = 0.5;
// Contact points: four corners, side middles and nose/tail middles, so a flank cannot slide over a post.
const CORNERS: readonly (readonly [number, number])[] = [
  [HALF_W, HALF_L], [-HALF_W, HALF_L], [HALF_W, -HALF_L], [-HALF_W, -HALF_L],
  [HALF_W, 0], [-HALF_W, 0], [0, HALF_L], [0, -HALF_L], [HALF_W, HALF_L / 2], [-HALF_W, HALF_L / 2], [HALF_W, -HALF_L / 2], [-HALF_W, -HALF_L / 2],
];

/**
 * Car vs the street (pure, no allocation). Each step: find the track position, apply verge grip loss
 * past the tarmac, and bounce the car off walls and static obstacles using its four corners.
 */
export class TrackContact {
  readonly hit: TrackHit = createHit();
  /** Closing speed of the latest hit (m/s), 0 when none. Read once per step by juice and audio. */
  impact = 0;
  /** Speed along the wall (m/s) while rubbing it, 0 when not touching: sparks and scrape sound. */
  scrape = 0;
  /** World contact point of the latest hit. */
  readonly contact = { x: 0, z: 0 };
  offroad = false;
  obstacles: ObstacleField | null = null;
  surfaces: SurfaceMap | null = null;
  /** What the tyres are on right now (puddle, ice, snow bank or dry). */
  readonly surface: SurfaceHit = createSurfaceHit();
  private readonly track: Track;
  private readonly corner: TrackHit = createHit();
  // worst contact found this step
  private pen = 0;
  private nx = 0;
  private nz = 0;
  private px = 0;
  private pz = 0;

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
    const i = ((index % n) + n) % n;
    const s = this.track.samples[i];
    car.reset(s.position.x + s.tangent.z * lateral, s.position.z - s.tangent.x * lateral, Math.atan2(s.tangent.x, s.tangent.z));
    this.hit.index = i;
  }

  update(car: CarController): void {
    const tr = this.track;
    const st = car.state;
    this.impact = 0;
    this.scrape = 0;
    locate(tr, st.position.x, st.position.z, this.hit.index, this.hit);
    this.offroad = Math.abs(this.hit.lateral) > halfWidthAt(tr, this.hit.index) + 0.3;
    const sf = this.surface;
    if (this.surfaces) this.surfaces.query(this.hit.index, this.hit.lateral, st.position.x, st.position.z, Math.abs(st.speed), sf);
    else {
      sf.kind = 'dry';
      sf.grip = 1;
      sf.drag = 0;
      sf.steer = 1;
    }
    car.surfaceGrip = (this.offroad ? VERGE_GRIP : 1) * sf.grip;
    car.surfaceDrag = (this.offroad ? VERGE_DRAG : 0) + sf.drag;
    car.steerAuthority = sf.steer;

    const sh = Math.sin(st.heading);
    const ch = Math.cos(st.heading);
    this.pen = 0;
    for (let k = 0; k < CORNERS.length; k++) {
      const cx = st.position.x + ch * CORNERS[k][0] + sh * CORNERS[k][1];
      const cz = st.position.z - sh * CORNERS[k][0] + ch * CORNERS[k][1];
      locate(tr, cx, cz, this.hit.index, this.corner);
      const side = this.corner.lateral > 0 ? 1 : -1;
      const pen = Math.abs(this.corner.lateral) - tr.wall[this.corner.index];
      if (pen > this.pen) {
        const t = tr.samples[this.corner.index].tangent;
        this.set(pen, -side * t.z, side * t.x, cx, cz); // inward normal = -side * leftNormal(tangent)
      }
      const list = this.obstacles?.near(this.corner.index);
      if (list) {
        for (let o = 0; o < list.length; o++) {
          const dx = cx - list[o].x;
          const dz = cz - list[o].z;
          const d = Math.hypot(dx, dz);
          if (d < list[o].r && list[o].r - d > this.pen) this.set(list[o].r - d, d > 1e-4 ? dx / d : 1, d > 1e-4 ? dz / d : 0, cx, cz);
        }
      }
    }
    if (this.pen > 0) this.respond(car);
  }

  private set(pen: number, nx: number, nz: number, px: number, pz: number): void {
    this.pen = pen;
    this.nx = nx;
    this.nz = nz;
    this.px = px;
    this.pz = pz;
  }

  private respond(car: CarController): void {
    const st = car.state;
    const { nx, nz, pen } = this;
    const vn = st.velocity.x * nx + st.velocity.z * nz;
    let dvx = 0;
    let dvz = 0;
    let yawPush = 0; // normal impulse x lever arm, plus a quarter of the friction's (rubbing must not spin the car)
    const armX = this.px - st.position.x;
    const armZ = this.pz - st.position.z;
    if (vn < 0) {
      const j = -(1 + RESTITUTION) * vn;
      const tx = st.velocity.x - vn * nx;
      const tz = st.velocity.z - vn * nz;
      const tl = Math.hypot(tx, tz);
      const fr = tl > 1e-4 ? Math.min(1, (WALL_MU * j) / tl) : 0;
      dvx = j * nx - tx * fr;
      dvz = j * nz - tz * fr;
      yawPush = j * (nx * armZ - nz * armX) - 0.25 * fr * (tx * armZ - tz * armX);
      this.impact = -vn;
      this.contact.x = this.px;
      this.contact.z = this.pz;
    }
    // Yaw kick from the off-centre hit (arm x impulse), kept modest so walls never spin the car wildly.
    let dr = Math.max(-1.5, Math.min(1.5, (yawPush * MASS) / INERTIA));
    // Deflection: the nose is turned along the wall so the car slides on instead of sticking to it.
    const fx = Math.sin(st.heading);
    const fz = Math.cos(st.heading);
    const dir = fx * -nz + fz * nx >= 0 ? 1 : -1; // wall direction nearest to the car's heading
    const e = dir * (-nz * fz - nx * fx); // sin of the angle from heading to that direction (+ = turn toward +heading)
    dr += Math.max(-0.12, Math.min(0.12, e * (0.03 + Math.min(0.1, Math.max(0, -vn) * 0.02))));
    this.scrape = Math.abs(st.velocity.x * -nz + st.velocity.z * nx);
    car.nudge(nx * pen, nz * pen, dvx, dvz, dr);
    if (this.impact > 2) car.drift.breakChain();
  }
}
