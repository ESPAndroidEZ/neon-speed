import type { CarController } from './carController';

const OFFSET = 1.15; // circle centres ahead of / behind the car centre
const RADIUS = 1.0;
const RESTITUTION = 0.3;
const FRICTION = 0.12; // side-to-side rubbing: slows the faster car, drags the slower one
const BROAD = 7; // skip pairs further apart than this (centre to centre)
const CIRCLES = [OFFSET, -OFFSET] as const;

/**
 * Car vs car using two circles per car. Mass based: the lighter car is pushed and bounced more, a heavy car barely
 * notices a small one. Side contact also exchanges a little tangential speed (rubbing), with a yaw kick from each contact
 * point. `strength` 1 is a full crash, below 1 a soft bump (rival against rival). Returns the closing speed (m/s), 0 if none.
 * No allocation.
 */
export function resolveCarPair(a: CarController, b: CarController, strength = 1): number {
  const sa = a.state;
  const sb = b.state;
  if (Math.hypot(sa.position.x - sb.position.x, sa.position.z - sb.position.z) > BROAD) return 0;
  const ma = a.t.mass;
  const mb = b.t.mass;
  const wa = mb / (ma + mb); // share of the correction and of the speed change that goes to car A
  const wb = ma / (ma + mb);
  const fax = Math.sin(sa.heading);
  const faz = Math.cos(sa.heading);
  const fbx = Math.sin(sb.heading);
  const fbz = Math.cos(sb.heading);
  let impact = 0;
  for (const ca of CIRCLES) {
    for (const cb of CIRCLES) {
      const ax = sa.position.x + fax * ca;
      const az = sa.position.z + faz * ca;
      const bx = sb.position.x + fbx * cb;
      const bz = sb.position.z + fbz * cb;
      const dx = ax - bx;
      const dz = az - bz;
      const d = Math.hypot(dx, dz);
      if (d >= RADIUS * 2) continue;
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      const pen = (RADIUS * 2 - d) * strength;
      const rvx = sa.velocity.x - sb.velocity.x;
      const rvz = sa.velocity.z - sb.velocity.z;
      const vn = rvx * nx + rvz * nz;
      let j = 0; // total speed change shared between the pair
      let jt = 0;
      let tx = 0;
      let tz = 0;
      if (vn < 0) {
        j = -(1 + RESTITUTION) * vn * strength;
        impact = Math.max(impact, -vn);
        tx = rvx - vn * nx;
        tz = rvz - vn * nz;
        jt = Math.min(1, FRICTION * (1 + -vn * 0.1)) * strength;
      }
      // yaw from the lever arm of each contact (world point minus car centre)
      const kickA = (ma / a.t.inertia) * j * wa;
      const kickB = (mb / b.t.inertia) * j * wb;
      a.nudge(nx * pen * wa, nz * pen * wa, nx * j * wa - tx * jt * wa, nz * j * wa - tz * jt * wa, clampYaw(((nx * (az - sa.position.z) - nz * (ax - sa.position.x)) * kickA)));
      b.nudge(-nx * pen * wb, -nz * pen * wb, -nx * j * wb + tx * jt * wb, -nz * j * wb + tz * jt * wb, clampYaw(((-nx * (bz - sb.position.z) + nz * (bx - sb.position.x)) * kickB)));
    }
  }
  return impact;
}

const clampYaw = (v: number): number => Math.max(-0.8, Math.min(0.8, v));
