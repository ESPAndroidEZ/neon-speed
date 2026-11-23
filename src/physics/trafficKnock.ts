/**
 * Knock-on for city traffic (owner playtest 2026-11-21 #11): a car the player hits is shoved along the impact and spins,
 * then rests where it ended up; while its stall runs out the offsets ease back to the lane (no snap). Pure, fixed pools,
 * no allocation per step. The pose of a car = its lane pose + these offsets (RoamTraffic.poses calls `add`).
 */
const DRAG = 2.6; // 1/s, how fast the shove dies
const SPIN_DRAG = 2.2;
const EASE = 1.4; // s before the stall ends in which the car returns to its lane
const MAX_SHOVE = 9; // m/s
const MAX_SPIN = 5; // rad/s

export class TrafficKnock {
  private readonly ox: Float32Array;
  private readonly oz: Float32Array;
  private readonly vx: Float32Array;
  private readonly vz: Float32Array;
  private readonly oh: Float32Array;
  private readonly w: Float32Array;

  constructor(count: number) {
    this.ox = new Float32Array(count); this.oz = new Float32Array(count); this.vx = new Float32Array(count);
    this.vz = new Float32Array(count); this.oh = new Float32Array(count); this.w = new Float32Array(count);
  }

  /** Car i was hit by something moving (vx, vz) m/s; `side` (-1..1) says on which side of the car it hit (spin sign). */
  hit(i: number, vx: number, vz: number, side: number): void {
    const sp = Math.hypot(vx, vz) || 1, k = Math.min(1, MAX_SHOVE / (sp * 0.6));
    this.vx[i] = vx * 0.6 * k; this.vz[i] = vz * 0.6 * k;
    this.w[i] = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, side * sp * 0.22));
  }

  /** Move the shoves on; `stall` is the car's remaining stall (s) so the offsets can ease out near its end. */
  step(i: number, dt: number, stall: number): void {
    const f = Math.exp(-DRAG * dt), fw = Math.exp(-SPIN_DRAG * dt);
    this.ox[i] += this.vx[i] * dt; this.oz[i] += this.vz[i] * dt; this.oh[i] += this.w[i] * dt;
    this.vx[i] *= f; this.vz[i] *= f; this.w[i] *= fw;
    if (stall < EASE) { // the car drives on: bring it back to its lane
      const e = Math.max(0, stall) / EASE, r = Math.exp(-6 * dt * (1 - e));
      this.ox[i] *= r; this.oz[i] *= r; this.oh[i] *= r;
    }
  }

  /** Is car i off its lane (shoved or turned)? */
  active(i: number): boolean {
    return Math.abs(this.ox[i]) + Math.abs(this.oz[i]) + Math.abs(this.oh[i]) > 0.01 || Math.abs(this.w[i]) > 0.01;
  }

  /** Add the offsets of car i to a lane pose. */
  add(i: number, x: Float32Array, z: Float32Array, h: Float32Array): void {
    x[i] += this.ox[i]; z[i] += this.oz[i]; h[i] += this.oh[i];
  }

  clear(i: number): void {
    this.ox[i] = 0; this.oz[i] = 0; this.vx[i] = 0; this.vz[i] = 0; this.oh[i] = 0; this.w[i] = 0;
  }
}
