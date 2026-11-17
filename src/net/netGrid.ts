import type { RaceManager } from '../core/raceManager';
import type { Racer } from '../core/raceResult';

/** Same grid on every screen: slot = position in the host's roster (the local grid always puts the player last). Mirrors RaceManager.place. */
export function placeGrid(rm: RaceManager, order: readonly Racer[]): void {
  const n = rm.track.samples.length;
  order.forEach((r, slot) => {
    const row = Math.floor(slot / 2);
    const idx = (n - 3 - row * 3 + n) % n;
    r.contact.place(r.car, idx, slot % 2 === 0 ? -2.6 : 2.6);
    r.laps.reset(idx);
    r.progress = r.laps.total;
  });
}
