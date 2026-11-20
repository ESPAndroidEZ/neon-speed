import type { CarController } from './carController';

const RESTITUTION = 0.28;
const WALL_MU = 0.4; // Coulomb: rubbing drag follows how hard the car presses on the wall, so a gentle scrape slides on
const MASS = 1300;
const INERTIA = 1900;

/** What a wall contact reports back (TrackContact and RoamContact both expose these). */
export interface WallReport { impact: number; scrape: number; readonly contact: { x: number; z: number } }

/**
 * Car against a wall: push out by `pen` along the inward normal (nx, nz), bounce and rub at contact point (px, pz),
 * a modest yaw kick, and turn the nose along the wall so the car slides on. Pure, no allocation. Moved unchanged out of
 * TrackContact (2026-11-20) so free roam's buildings and quay feel exactly like race walls.
 */
export function wallHit(car: CarController, pen: number, nx: number, nz: number, px: number, pz: number, out: WallReport): void {
  const st = car.state;
  const vn = st.velocity.x * nx + st.velocity.z * nz;
  let dvx = 0;
  let dvz = 0;
  let yawPush = 0; // normal impulse x lever arm, plus a quarter of the friction's (rubbing must not spin the car)
  const armX = px - st.position.x;
  const armZ = pz - st.position.z;
  if (vn < 0) {
    const j = -(1 + RESTITUTION) * vn;
    const tx = st.velocity.x - vn * nx;
    const tz = st.velocity.z - vn * nz;
    const tl = Math.hypot(tx, tz);
    const fr = tl > 1e-4 ? Math.min(1, (WALL_MU * j) / tl) : 0;
    dvx = j * nx - tx * fr;
    dvz = j * nz - tz * fr;
    yawPush = j * (nx * armZ - nz * armX) - 0.25 * fr * (tx * armZ - tz * armX);
    out.impact = -vn;
  }
  out.contact.x = px;
  out.contact.z = pz;
  // Yaw kick from the off-centre hit (arm x impulse), kept modest so walls never spin the car wildly.
  let dr = Math.max(-1.5, Math.min(1.5, (yawPush * MASS) / INERTIA));
  // Deflection: the nose is turned along the wall so the car slides on instead of sticking to it.
  const fx = Math.sin(st.heading);
  const fz = Math.cos(st.heading);
  const dir = fx * -nz + fz * nx >= 0 ? 1 : -1; // wall direction nearest to the car's heading
  const e = dir * (-nz * fz - nx * fx); // sin of the angle from heading to that direction (+ = turn toward +heading)
  dr += Math.max(-0.12, Math.min(0.12, e * (0.03 + Math.min(0.1, Math.max(0, -vn) * 0.02))));
  out.scrape = Math.abs(st.velocity.x * -nz + st.velocity.z * nx);
  car.nudge(nx * pen, nz * pen, dvx, dvz, dr);
  if (out.impact > 2) car.drift.breakChain();
}
