import type { RewardKind } from '../core/rewards';

/** Per-race driving stats for the results screen (display only: reads the game, never feeds physics). */
export class RaceStats {
  topKph = 0;
  near = 0;
  slip = 0;
  clean = 0;

  /** Call every frame while the player is racing (speed in m/s). Non-finite or negative speeds are ignored. */
  step(speedMs: number): void {
    const kph = speedMs * 3.6;
    if (Number.isFinite(kph) && kph > this.topKph) this.topKph = kph;
  }

  /** Count one reward the HUD just announced. */
  count(kind: RewardKind | null): void {
    if (kind === 'NEAR MISS') this.near++;
    else if (kind === 'SLIPSTREAM') this.slip++;
    else if (kind === 'CLEAN CORNER') this.clean++;
  }

  /** True when there is anything worth showing. */
  get any(): boolean {
    return this.topKph >= 1;
  }

  /** New race or restart. */
  reset(): void {
    this.topKph = 0;
    this.near = 0;
    this.slip = 0;
    this.clean = 0;
  }
}

/** Shared by the race feedback (writes) and the results screen (reads). */
export const raceStats = new RaceStats();
