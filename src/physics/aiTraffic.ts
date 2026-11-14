import type { AIWorldView, CarState } from '../types/game';
import type { RacingLine } from './aiLine';

/** What the cars around one driver mean for its line and speed this step. Reused, never reallocated. */
export interface Traffic {
  /** Wanted lateral shift from the racing line, metres (+ left). */
  shift: number;
  /** In the slipstream of a car ahead. */
  draft: boolean;
  /** Speed ceiling to avoid running into the car ahead (m/s), Infinity when free. */
  cap: number;
  /** A car is close behind on a straight: being defended against. */
  defending: boolean;
  /** Distance to the nearest car ahead in my lane (m), Infinity when none. */
  gap: number;
}

export const createTraffic = (): Traffic => ({ shift: 0, draft: false, cap: Infinity, defending: false, gap: Infinity });

const PASS_SHIFT = 2.4;

/**
 * Racecraft: slipstream on a straight, dive-bombs to the inside of the next corner, side-by-side room, and blocking.
 * `overtake` and `block` (0..1, already combined from the level and the style) decide how bold the driver is.
 */
export function readTraffic(self: CarState, world: AIWorldView, line: RacingLine, hint: number, overtake: number, block: number, speedTarget: number, out: Traffic): void {
  out.shift = 0;
  out.draft = false;
  out.cap = Infinity;
  out.defending = false;
  out.gap = Infinity;
  const fx = Math.sin(self.heading);
  const fz = Math.cos(self.heading);
  const bend = line.ks[(hint + 8) % line.n] + line.ks[(hint + 16) % line.n]; // + = left corner coming up
  const straight = line.k[hint] < 0.012;
  for (let r = 0; r < world.racers.length; r++) {
    const o = world.racers[r];
    if (o === self) continue;
    const dx = o.position.x - self.position.x;
    const dz = o.position.z - self.position.z;
    const ahead = dx * fx + dz * fz;
    if (ahead > 36 || ahead < -16) continue;
    const side = dx * fz - dz * fx; // + : the other car is to my right
    const lat = Math.abs(side);
    const theirs = o.velocity.x * fx + o.velocity.z * fz;
    if (ahead > 1 && lat < 2.3) {
      out.gap = Math.min(out.gap, ahead);
      if (ahead > 6 && ahead < 30 && lat < 1.5 && !out.draft) out.draft = true;
      const faster = speedTarget > theirs + 0.6 || ahead < 12;
      if (faster && overtake > 0.15) {
        // inside of the next corner if it is free, otherwise the open side
        let dir = bend > 0.004 ? 1 : bend < -0.004 ? -1 : side > 0 ? 1 : -1;
        if ((dir > 0 && side < -0.6) || (dir < 0 && side > 0.6)) dir = -dir; // the car is on that side already
        out.shift += dir * PASS_SHIFT * Math.min(1, overtake) * Math.min(1, (36 - ahead) / 20);
      }
      if (ahead < 9 + (1 - overtake) * 8 && theirs < speedTarget) out.cap = Math.min(out.cap, theirs + 1 + overtake * 3.5);
    } else if (Math.abs(ahead) <= 3.6 && lat < 3.4) {
      out.shift += side > 0 ? 0.9 : -0.9; // alongside: leave room
    } else if (ahead < -1 && lat < 2.6 && straight && block > 0.1 && speedTarget > 12) {
      out.defending = true;
      out.shift += (side > 0 ? -1 : 1) * 1.7 * Math.min(1, block); // slide across to cover the car behind
    }
  }
  out.shift = Math.max(-3.2, Math.min(3.2, out.shift));
}
