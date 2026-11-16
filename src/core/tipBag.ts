/**
 * Shuffled bag: every item comes out once before any repeats, and the first item of a new round is never the
 * last one of the previous round. `rnd` returns 0..1 (Math.random in the game, a seeded rng in tests).
 */
export class TipBag {
  private order: number[] = [];
  private last = -1;

  private readonly size: number;
  private readonly rnd: () => number;

  constructor(size: number, rnd: () => number) {
    this.size = size;
    this.rnd = rnd;
  }

  /** Index of the next item to show (0 when the bag has no items). */
  next(): number {
    if (this.size <= 0) return 0;
    if (this.order.length === 0) this.refill();
    const i = this.order.pop() as number;
    this.last = i;
    return i;
  }

  private refill(): void {
    const o = this.order;
    for (let i = 0; i < this.size; i++) o.push(i);
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(this.rnd() * (i + 1));
      const tmp = o[i]; o[i] = o[j]; o[j] = tmp;
    }
    // next() pops from the end: keep it from repeating the tip just shown
    if (this.size > 1 && o[o.length - 1] === this.last) { const tmp = o[0]; o[0] = o[o.length - 1]; o[o.length - 1] = tmp; }
  }
}
