/**
 * Tap-to-pulse button state for the phone handbrake and nitro. A press is LATCHED until the next fixed physics step
 * consumes it, so a tap shorter than a step (or than a display frame) is never lost; the output then stays on for
 * `pulse` seconds of simulation from the press, or for as long as the finger is held if that is longer.
 * Pointer handlers call press() / release() at any time; the fixed update calls step(dt) once per physics step.
 */
export class PulseLatch {
  /** Seconds the output stays on after a tap (tunable). */
  pulse: number;
  private held = false;
  private pending = false;
  private left = 0;
  private on = false;

  constructor(pulse: number) {
    this.pulse = pulse;
  }

  press(): void {
    this.held = true;
    this.pending = true;
  }

  release(): void {
    this.held = false;
  }

  /** Clear everything (overlay hidden, race restarted). */
  reset(): void {
    this.held = this.pending = this.on = false;
    this.left = 0;
  }

  /** Advance one fixed step; returns whether the button acts during this step. */
  step(dt: number): boolean {
    if (this.pending) {
      this.pending = false;
      this.left = this.pulse; // the pulse runs from the press; a longer hold simply keeps it on
    }
    this.on = this.held || this.left > 0;
    this.left = Math.max(0, this.left - dt);
    return this.on;
  }

  /** Output of the last step (for button highlight). */
  get active(): boolean {
    return this.on;
  }
}
