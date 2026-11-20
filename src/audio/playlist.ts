/**
 * Shuffle bag for the background music (pure, no Web Audio). Every item plays once before any repeats and the same
 * item never plays twice in a row, also across the boundary between two bags. Items are plain numbers chosen by the
 * caller (MusicDirector: house song indices, SYNTH_ITEM for the synthwave track).
 */
export class Playlist {
  private items: number[] = [];
  private bag: number[] = [];
  private last = -1;
  private readonly rnd: () => number;

  constructor(rnd: () => number = Math.random) {
    this.rnd = rnd;
  }

  /** Replaces the pool (style change). Keeps the last item so the next pick still avoids it. */
  setItems(items: readonly number[]): void {
    this.items = items.slice();
    this.bag.length = 0;
  }

  has(item: number): boolean {
    return this.items.includes(item);
  }

  /** The next item; -1 when the pool is empty. A pool of one item repeats it (nothing else to play). */
  next(): number {
    if (this.items.length === 0) return -1;
    if (this.bag.length === 0) this.refill();
    const v = this.bag.pop() as number;
    this.last = v;
    return v;
  }

  /** Remembers what is playing now (the first song is chosen by the caller or by next()). */
  markPlayed(item: number): void {
    this.last = item;
    const i = this.bag.indexOf(item);
    if (i >= 0) this.bag.splice(i, 1);
  }

  private refill(): void {
    const b = this.bag;
    for (const v of this.items) b.push(v);
    for (let i = b.length - 1; i > 0; i--) { // Fisher-Yates
      const j = Math.floor(this.rnd() * (i + 1));
      const tmp = b[i]; b[i] = b[j]; b[j] = tmp;
    }
    // pop() takes from the end: never start a new bag with the song that just ended
    if (b.length > 1 && b[b.length - 1] === this.last) {
      const tmp = b[0]; b[0] = b[b.length - 1]; b[b.length - 1] = tmp;
    }
  }
}
