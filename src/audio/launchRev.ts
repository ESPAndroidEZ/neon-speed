/**
 * Start-line rev (audio only). The car is locked during the 3-2-1, so the drivetrain stays at idle even with the
 * gas flat; this fakes the engine winding up against the brakes and, at GO, lets the sound fall back to the real
 * rpm instead of snapping. Pure arithmetic, no allocation, nothing here touches physics or saves.
 */
const HOLD_FRAC = 0.64;   // fraction of redline held on the line (just under the limiter, like a launch-control hold)
const WOBBLE_HZ = 9;      // small rpm flutter on the hold so it sounds alive
const WOBBLE_RPM = 90;

export class LaunchRev {
  rpm = 0;
  load = 0;
  private t = 0;

  /** Countdown frame. Gas up -> rpm climbs fast, gas off -> it drops back to idle. */
  hold(dt: number, throttle: number, idle: number, redline: number): void {
    this.t += dt;
    const target = idle + (redline * HOLD_FRAC - idle) * Math.min(1, Math.max(0, throttle));
    const rate = target > this.rpm ? 5.5 : 3.2;
    if (this.rpm < idle) this.rpm = idle;
    this.rpm += (target - this.rpm) * Math.min(1, dt * rate);
    if (throttle > 0.5) this.rpm += Math.sin(this.t * WOBBLE_HZ * 6.283) * WOBBLE_RPM * Math.min(1, dt * 60) * 0.1;
    this.load = Math.min(1, throttle);
  }

  /** Any other frame: follow the real rpm, but fall to it smoothly from a held rev. Returns the rpm to play. */
  release(dt: number, realRpm: number): number {
    if (this.rpm > realRpm) this.rpm += (realRpm - this.rpm) * Math.min(1, dt * 6);
    else this.rpm = realRpm;
    return this.rpm;
  }
}
