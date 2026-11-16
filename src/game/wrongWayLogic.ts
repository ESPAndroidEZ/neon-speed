/** Wrong-way detector: the car is moving fast against the direction of the road for a while. Pure and allocation free; display only. */
export interface WrongWayMemory {
  /** Seconds spent going the wrong way (decays when not). */
  time: number;
  on: boolean;
}

export const WRONG_WAY_ON = 1.2;
const MIN_SPEED = 6; // m/s: slower than this is a spin or a reverse, not a wrong way
const AGAINST = -0.35; // cos of the angle between travel and the road

export function newWrongWay(): WrongWayMemory {
  return { time: 0, on: false };
}

/** Velocity (vx, vz) against the road tangent (tx, tz, unit). Returns whether the warning should show. */
export function wrongWayUpdate(m: WrongWayMemory, dt: number, vx: number, vz: number, tx: number, tz: number): boolean {
  const sp = Math.hypot(vx, vz);
  const against = sp > MIN_SPEED && (vx * tx + vz * tz) / sp < AGAINST;
  m.time = against ? m.time + dt : Math.max(0, m.time - dt * 2);
  if (m.time >= WRONG_WAY_ON) m.on = true;
  else if (m.time <= 0.2) m.on = false; // hysteresis: stays up until the car has clearly turned around
  return m.on;
}
