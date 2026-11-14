import { resolveCarPair } from '../physics/carCollision';
import type { Racer } from './raceResult';

const UNSTICK_AFTER = 9; // seconds pinned before a rival is lifted back onto the road
const RIVAL_BUMP = 0.12; // strength of a rival-rival bump (1 = a full crash)

/** Car-car contacts: the player's are full crashes, rivals trade soft bumps. Returns the player's worst closing speed. */
export function resolveField(racers: readonly Racer[]): number {
  let impact = 0;
  for (let i = 0; i < racers.length; i++)
    for (let j = i + 1; j < racers.length; j++) {
      const hard = racers[i].isPlayer || racers[j].isPlayer;
      const c = resolveCarPair(racers[i].car, racers[j].car, hard ? 1 : RIVAL_BUMP);
      if (hard) impact = Math.max(impact, c);
    }
  return impact;
}

/** A rival that gains no new ground for UNSTICK_AFTER seconds (pinned, spinning, crawling in a loop) is lifted back onto the road. The player has R. */
export function unstick(r: Racer, dt: number): void {
  if (r.laps.total > r.progress + 2) {
    r.progress = r.laps.total;
    r.stuck = 0;
    return;
  }
  r.stuck += dt;
  if (r.stuck < UNSTICK_AFTER) return;
  r.stuck = 0;
  r.contact.place(r.car, r.contact.nearestIndex(r.car));
  r.laps.teleport(r.contact.hit.index);
}
