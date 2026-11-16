/**
 * Phone vibration for crashes (display/feel only, never touches physics). Light scrapes stay silent, harder hits
 * buzz longer, and a minimum gap keeps a car grinding along a wall from turning into a constant drone.
 */
export const HAPTIC_MIN_IMPACT = 3;
export const HAPTIC_GAP_MS = 160;
export const HAPTIC_STRONG_AT = 9;

export interface ImpactPulse { ms: number; strong: boolean }

export class ImpactHaptic {
  private last = -1e9;
  /** Reused result: valid until the next call. */
  private readonly out: ImpactPulse = { ms: 0, strong: false };

  /** `strength` is the closing speed of the hit (m/s), `nowMs` a monotonic clock. Null when nothing should buzz. */
  pulse(strength: number, nowMs: number): ImpactPulse | null {
    if (!(strength >= HAPTIC_MIN_IMPACT) || nowMs - this.last < HAPTIC_GAP_MS) return null;
    this.last = nowMs;
    this.out.ms = Math.round(Math.min(70, 12 + strength * 4));
    this.out.strong = strength >= HAPTIC_STRONG_AT;
    return this.out;
  }
}
