/**
 * Launch timing at the 3-2-1 countdown (player only). The car is locked until GO; how long the throttle was
 * held before GO decides the start:
 *   PERFECT  pressed in the last 0.6 s   -> 1.1 s of extra push (about +4 m/s by the end)
 *   GOOD     pressed 0.6-1.2 s before GO -> 0.7 s of a smaller push
 *   EARLY    held longer (over-revved)   -> 0.7 s bogged start, throttle cut to 40 %
 *   NONE     not pressed at GO           -> normal start
 * Pure state and arithmetic, deterministic, snapshot/restore for the save system.
 */
export type LaunchResult = 'NONE' | 'PERFECT' | 'GOOD' | 'EARLY';

export interface LaunchData { held: number; result: LaunchResult; timer: number }

const PUSH: Record<LaunchResult, [number, number]> = { NONE: [0, 0], PERFECT: [1.1, 4.2], GOOD: [0.7, 2.6], EARLY: [0.7, 0] };

export class LaunchControl {
  /** Seconds the throttle has been held continuously during the countdown. */
  held = 0;
  result: LaunchResult = 'NONE';
  /** Seconds of launch effect left after GO. */
  timer = 0;
  /** Set once at GO (the HUD shows a pop-up and clears it). */
  announce: LaunchResult | null = null;

  reset(): void {
    this.held = 0;
    this.result = 'NONE';
    this.timer = 0;
    this.announce = null;
  }

  /** Every fixed step of the countdown. */
  countdownStep(dt: number, throttle: number): void {
    this.held = throttle > 0.5 ? this.held + dt : 0;
  }

  /** Once, the step the race goes live. */
  go(): void {
    const h = this.held;
    this.result = h <= 0 ? 'NONE' : h <= 0.6 ? 'PERFECT' : h <= 1.2 ? 'GOOD' : 'EARLY';
    this.timer = PUSH[this.result][0];
    this.announce = this.result === 'NONE' ? null : this.result;
  }

  /** Before the car steps: an over-revved start bogs (throttle cut). */
  shapeInput(input: { throttle: number }): void {
    if (this.timer > 0 && this.result === 'EARLY') input.throttle *= 0.4;
  }

  /** After the car steps: forward push in m/s^2 to add to its forward speed this step (0 when done). */
  push(dt: number, throttle: number): number {
    if (this.timer <= 0) return 0;
    this.timer = Math.max(0, this.timer - dt);
    return this.result === 'EARLY' ? 0 : PUSH[this.result][1] * Math.min(1, throttle);
  }

  snapshot(): LaunchData {
    return { held: this.held, result: this.result, timer: this.timer };
  }

  restore(d: LaunchData | undefined): void {
    this.reset();
    if (!d) return;
    this.held = d.held;
    this.result = d.result;
    this.timer = d.timer;
  }
}
