import type { Racer } from '../core/raceResult';

/** Time gaps to the nearest racer ahead of and behind the player. Display only; allocation free (fill the same object each call). */
export interface Gaps {
  /** Index into `racers`, -1 when nobody is ahead / behind. */
  ahead: number;
  behind: number;
  /** Seconds, always positive. */
  aheadSec: number;
  behindSec: number;
}

export function newGaps(): Gaps {
  return { ahead: -1, behind: -1, aheadSec: 0, behindSec: 0 };
}

const MIN_SPEED = 15; // m/s: a floor so the gap does not explode on the grid or after a crash
const MAX_SEC = 99;

/** Distance along the route (progress samples times spacing) divided by the chaser's speed. Finished racers are skipped. */
export function computeGaps(racers: readonly Racer[], me: Racer, spacing: number, out: Gaps): Gaps {
  out.ahead = out.behind = -1;
  let up = Infinity, down = Infinity;
  for (let i = 0; i < racers.length; i++) {
    const r = racers[i];
    if (r === me || r.finished) continue;
    const d = (r.laps.total - me.laps.total) * spacing;
    if (d > 0 && d < up) { up = d; out.ahead = i; }
    else if (d <= 0 && -d < down) { down = -d; out.behind = i; }
  }
  if (out.ahead >= 0) out.aheadSec = Math.min(MAX_SEC, up / Math.max(MIN_SPEED, Math.abs(me.car.state.speed)));
  if (out.behind >= 0) out.behindSec = Math.min(MAX_SEC, down / Math.max(MIN_SPEED, Math.abs(racers[out.behind].car.state.speed)));
  return out;
}
