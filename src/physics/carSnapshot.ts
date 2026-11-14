import type { CarState } from '../types/game';
import type { CarController } from './carController';

const copyState = (a: CarState, b: CarState): void => {
  a.position.x = b.position.x; a.position.y = b.position.y; a.position.z = b.position.z;
  a.velocity.x = b.velocity.x; a.velocity.y = b.velocity.y; a.velocity.z = b.velocity.z;
  a.heading = b.heading; a.speed = b.speed; a.yawRate = b.yawRate; a.slipAngle = b.slipAngle;
};

/** JSON-safe copy of everything a car controller (and its drivetrain and drift scorer) remembers between steps. */
export function snapshotCar(c: CarController): {
  state: CarState; u: number; v: number; r: number; hb: number; prev: [number, number, number];
  surf: [number, number, number]; ld: [number, number, number, number, number]; flags: CarController['flags']; drivetrain: unknown; drift: unknown;
} {
  const st: CarState = { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, heading: 0, speed: 0, yawRate: 0, slipAngle: 0 };
  copyState(st, c.state);
  return {
    state: st, u: c.u, v: c.v, r: c.r, hb: c.hbFactor, prev: [c.prevX, c.prevZ, c.prevHeading],
    surf: [c.surfaceGrip, c.surfaceDrag, c.steerAuthority], ld: [c.load.ax, c.load.ay, c.axRaw, c.ayRaw, c.thr], flags: { ...c.flags }, drivetrain: c.drivetrain.snapshot(), drift: c.drift.snapshot(),
  };
}

export function restoreCar(c: CarController, d: ReturnType<typeof snapshotCar>): void {
  copyState(c.state, d.state);
  c.u = d.u; c.v = d.v; c.r = d.r; c.hbFactor = d.hb;
  [c.prevX, c.prevZ, c.prevHeading] = d.prev;
  [c.surfaceGrip, c.surfaceDrag, c.steerAuthority] = d.surf;
  c.axRaw = d.ld[2];
  c.ayRaw = d.ld[3];
  c.thr = d.ld[4];
  c.load.ax = d.ld[0];
  c.load.ay = d.ld[1];
  Object.assign(c.flags, d.flags);
  c.drivetrain.restore(d.drivetrain);
  c.drift.restore(d.drift);
}
