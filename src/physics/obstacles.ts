/** A static circular obstacle (parked car half, bollard). */
export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

/** Obstacles bucketed by the nearest track sample so contact only checks the few that are close. */
export class ObstacleField {
  private readonly buckets: Obstacle[][];
  private readonly n: number;
  static readonly EMPTY: readonly Obstacle[] = [];

  constructor(sampleCount: number) {
    this.n = sampleCount;
    this.buckets = Array.from({ length: sampleCount }, () => []);
  }

  /** Register an obstacle whose nearest track sample is `index`. It is visible from samples within +/-5. */
  add(index: number, o: Obstacle): void {
    for (let k = -5; k <= 5; k++) this.buckets[(index + k + this.n * 2) % this.n].push(o);
  }

  near(index: number): readonly Obstacle[] {
    return this.buckets[index] ?? ObstacleField.EMPTY;
  }
}
