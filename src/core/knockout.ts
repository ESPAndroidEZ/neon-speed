import type { Racer } from './raceResult';
import { positionOf } from './raceResult';

/**
 * Knockout (docs/nfs-vision.md section 2): every time the leader finishes a lap the car in last place is out, until two
 * are left for the last lap. A knocked-out car is finished, ranked behind everyone still in (`Racer.out`), coasts to a stop
 * and takes no part in collisions. Pure; the RaceManager calls `update` after the laps.
 */
export class Knockout {
  /** Cars out so far, and a counter that goes up with each one (the HUD pops up the name). */
  out = 0;
  seq = 0;
  last = '';
  lastWasPlayer = false;
  private lapsDone = 0;

  /** The race length for a field of `n` cars: one lap per knock-out plus the last lap of the final two. */
  static laps(n: number): number { return Math.max(2, n - 1); }

  update(racers: readonly Racer[], totalLaps: number): void {
    let leader = 0, active = 0;
    for (const r of racers) if (!r.finished) { active++; leader = Math.max(leader, r.laps.laps); }
    while (this.lapsDone < Math.min(leader, totalLaps - 1) && active > 2) {
      this.lapsDone++;
      let worst: Racer | null = null;
      for (const r of racers) if (!r.finished && (!worst || positionOf(racers, r) > positionOf(racers, worst))) worst = r;
      if (!worst) return;
      worst.finished = true;
      worst.out = true;
      worst.finishRank = racers.length - this.out;
      this.out++; this.seq++; active--;
      this.last = worst.name;
      this.lastWasPlayer = worst.isPlayer;
    }
  }

  reset(): void { this.out = 0; this.seq = 0; this.last = ''; this.lastWasPlayer = false; this.lapsDone = 0; }
}
