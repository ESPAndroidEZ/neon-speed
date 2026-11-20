/** Samples per second of race time; the server's plausibility check (server/api/scores-lib.php LB_HZ) uses the same. */
export const LAP_HZ = 10;
const MAX = 6000; // 10 minutes of race time

/**
 * The player's position over a whole race at 10 Hz of race time (pure, no DOM, no three; the buffer is allocated once).
 * Frame i is the pose at race time i / LAP_HZ; slow frames repeat the pose so the timeline stays true. At the finish
 * `slice` cuts out the best lap as plain numbers for the leaderboard (that one allocation happens once per race).
 */
export class LapFrames {
  private readonly buf = new Float32Array(MAX * 4);
  private n = 0;

  reset(): void {
    this.n = 0;
  }

  get count(): number {
    return this.n;
  }

  record(raceTime: number, x: number, y: number, z: number, h: number): void {
    while (this.n < MAX && raceTime >= this.n / LAP_HZ) {
      const j = this.n * 4;
      this.buf[j] = x; this.buf[j + 1] = y; this.buf[j + 2] = z; this.buf[j + 3] = h;
      this.n++;
    }
  }

  /** Frames from race time `start` to `end` (s), rounded to 1 cm / 0.01 rad. Empty when the race was not recorded. */
  slice(start: number, end: number): number[] {
    const i0 = Math.max(0, Math.floor(start * LAP_HZ));
    const i1 = Math.min(this.n - 1, Math.ceil(end * LAP_HZ));
    const out: number[] = [];
    for (let i = i0 * 4; i <= i1 * 4 + 3 && i1 >= i0; i++) out.push(Math.round(this.buf[i] * 100) / 100);
    return out;
  }
}

/** Index and start time (race seconds) of the fastest lap in `laps`; -1 when there are none. */
export function bestLapOf(laps: readonly number[]): { index: number; start: number } {
  let index = -1, start = 0, at = 0;
  for (let i = 0; i < laps.length; i++) {
    if (index < 0 || laps[i] < laps[index]) { index = i; start = at; }
    at += laps[i];
  }
  return { index, start };
}
