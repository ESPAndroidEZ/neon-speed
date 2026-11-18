/**
 * Fires once when the player starts the last lap of a multi-lap race (display only).
 * Seeing a lap for the first time (race start, or a restored save) never fires; only a real step up to the last lap does.
 */
export class FinalLapCue {
  private prev = 0;

  /** Call every frame while racing; true on the frame the last lap begins. */
  step(lap: number, total: number): boolean {
    const was = this.prev;
    this.prev = lap;
    return total >= 2 && was > 0 && was < lap && lap === total;
  }

  /** New race or restart. */
  reset(): void {
    this.prev = 0;
  }
}
