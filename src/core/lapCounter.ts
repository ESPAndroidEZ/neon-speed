import type { Track } from '../world/track';

/**
 * Lap logic from sequential track progress. Progress accumulates the wrapped change in nearest-sample
 * index, so driving backwards subtracts and jumps larger than 1/6 of a lap (shortcuts across the infield,
 * teleports) are ignored: a lap only counts when the whole circuit was driven in order.
 */
export class LapCounter {
  /** Net samples driven since the start line (negative while on the grid behind it). */
  total = 0;
  readonly checkpoints: number;
  private last = 0;
  private readonly n: number;

  constructor(track: Track, checkpoints = 8) {
    this.n = track.samples.length;
    this.checkpoints = checkpoints;
  }

  /** Start on the grid at `index` (indices past halfway count as behind the line). */
  reset(index: number): void {
    this.last = index;
    this.total = index > this.n / 2 ? index - this.n : index;
  }

  /** Re-place without counting progress (reset-to-track key). */
  teleport(index: number): void {
    this.last = index;
  }

  update(index: number): void {
    let d = index - this.last;
    if (d > this.n / 2) d -= this.n;
    else if (d < -this.n / 2) d += this.n;
    this.last = index;
    if (Math.abs(d) <= this.n / 6) this.total += d;
  }

  /** Finished laps (the start line crossed in order `lap` times). */
  get laps(): number {
    return Math.max(0, Math.floor(this.total / this.n));
  }

  /** Checkpoint index 0..checkpoints-1 within the current lap. */
  get checkpoint(): number {
    const t = Math.max(0, this.total) % this.n;
    return Math.floor((t * this.checkpoints) / this.n);
  }

  /** Total distance driven in laps (fractional), for ranking racers. */
  get progress(): number {
    return this.total / this.n;
  }
}
