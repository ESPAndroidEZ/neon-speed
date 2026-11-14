import type { CarController } from './carController';

const OFFSET = 1.15; // circle centres ahead of / behind the car centre
const RADIUS = 1.0;
const RESTITUTION = 0.3;
const MASS = 1300;
const INERTIA = 1900;
const BROAD = 7; // skip pairs further apart than this (centre to centre)
const CIRCLES = [OFFSET, -OFFSET] as const;

/**
 * Car vs car using two circles per car. Equal masses: the position error and the closing speed are split
 * evenly, with a small yaw kick from each contact point. Returns the closing speed (m/s), 0 if no contact.
 * No allocation.
 */
export function resolveCarPair(a: CarController, b: CarController): number {
  const sa = a.state;
  const sb = b.state;
  if (Math.hypot(sa.position.x - sb.position.x, sa.position.z - sb.position.z) > BROAD) return 0;
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
      const pen = (RADIUS * 2 - d) * 0.5;
      const vn = (sa.velocity.x - sb.velocity.x) * nx + (sa.velocity.z - sb.velocity.z) * nz;
      let j = 0;
      if (vn < 0) {
        j = (-(1 + RESTITUTION) * vn) * 0.5;
        impact = Math.max(impact, -vn);
      }
      // yaw from the lever arm of each contact (world point minus car centre)
      const armAx = ax - sa.position.x;
      const armAz = az - sa.position.z;
      const armBx = bx - sb.position.x;
      const armBz = bz - sb.position.z;
      const kick = (MASS / INERTIA) * j;
      a.nudge(nx * pen, nz * pen, nx * j, nz * j, clampYaw((nx * armAz - nz * armAx) * kick));
      b.nudge(-nx * pen, -nz * pen, -nx * j, -nz * j, clampYaw((-nx * armBz + nz * armBx) * kick));
    }
  }
  return impact;
}

const clampYaw = (v: number): number => Math.max(-0.8, Math.min(0.8, v));
