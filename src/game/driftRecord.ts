const MIN_BANK = 600; // same threshold the HUD uses for the "banked" pop-up

/**
 * Tells the player when a banked drift beats their lifetime best (display only).
 * `best` is the stored record at race start; a first-ever record (best 0) stays quiet so early drifts do not spam.
 */
export class DriftRecordCue {
  private best = 0;
  private peak = 0;

  /** Call at the start of every race with the stored lifetime best drift. */
  reset(best: number): void {
    this.best = best;
    this.peak = 0;
  }

  /** A restart or countdown: forget the drift in progress without banking it. */
  abort(): void {
    this.peak = 0;
  }

  /** Call every frame with the live drift score. Returns the new record when a drift is banked above the old one, else 0. */
  step(driftScore: number): number {
    if (driftScore > 0) {
      if (driftScore > this.peak) this.peak = driftScore;
      return 0;
    }
    const banked = this.peak;
    this.peak = 0;
    if (banked < MIN_BANK || banked <= this.best) return 0;
    const had = this.best > 0;
    this.best = banked;
    return had ? banked : 0;
  }
}
