const HOLD = 0.45; // seconds a new position must hold before it counts (side-by-side swaps do not flicker)

/**
 * Detects a real change of the player's race position (display only).
 * +1 = moved up, -1 = dropped back, 0 = nothing. The first position seen never fires.
 */
export class PosCue {
  private shown = 0; // last position the player was told about
  private cand = 0;
  private held = 0;

  /** Call every frame while racing. */
  step(position: number, count: number, dt: number): -1 | 0 | 1 {
    if (count < 2 || position < 1) return 0;
    if (this.shown === 0) { this.shown = position; return 0; }
    if (position === this.shown) { this.cand = 0; return 0; }
    if (position !== this.cand) { this.cand = position; this.held = 0; }
    this.held += dt;
    if (this.held < HOLD) return 0;
    const up = position < this.shown;
    this.shown = position;
    this.cand = 0;
    return up ? 1 : -1;
  }

  /** New race or restart. */
  reset(): void {
    this.shown = 0;
    this.cand = 0;
    this.held = 0;
  }
}
