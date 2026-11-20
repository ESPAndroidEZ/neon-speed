/**
 * Time-sliced chunk streaming (pure: no three, no DOM). Chunks within `live` cells of the camera cell are built
 * nearest first by jobs that run one slice per `next()` call; a frame runs slices until `budgetMs` is used. Chunks
 * beyond `keep` cells are disposed (a half-built one is dropped). Steady state (camera inside one cell, nothing to
 * build) allocates nothing; the wanted list is rebuilt only when the camera changes cell.
 */
export interface ChunkJob<T> {
  /** One slice of work; `done` with the finished chunk as `value`. */
  next(): IteratorResult<unknown, T>;
}

export class Streamer<T> {
  readonly n: number;
  readonly live = new Map<number, T>();
  /** Milliseconds spent in the last update, and the most any update spent. */
  lastMs = 0;
  maxMs = 0;
  private readonly radius: number;
  private readonly keep: number;
  private readonly budgetMs: number;
  private readonly start: (i: number) => ChunkJob<T>;
  private readonly dispose: (i: number, chunk: T) => void;
  private readonly clock: () => number;
  private wanted: number[] = [];
  private cell = -1;
  private job: { i: number; it: ChunkJob<T> } | null = null;

  constructor(o: { n: number; live?: number; keep?: number; budgetMs?: number; start: (i: number) => ChunkJob<T>; dispose: (i: number, chunk: T) => void; clock?: () => number }) {
    this.n = o.n;
    this.radius = o.live ?? 2;
    this.keep = o.keep ?? 3;
    this.budgetMs = o.budgetMs ?? 3;
    this.start = o.start;
    this.dispose = o.dispose;
    this.clock = o.clock ?? (() => performance.now());
  }

  /** Chunks still to build for the current camera cell. */
  get pending(): number {
    return this.wanted.length + (this.job ? 1 : 0);
  }

  /** Call once per frame with the camera's cell (column, row). */
  update(cx: number, cz: number): void {
    const t0 = this.clock();
    const cell = cz * this.n + cx;
    if (cell !== this.cell) this.retarget(cx, cz, cell);
    while (this.clock() - t0 < this.budgetMs) {
      if (!this.job) {
        const i = this.wanted.shift();
        if (i === undefined) break;
        this.job = { i, it: this.start(i) };
      }
      const r = this.job.it.next();
      if (r.done) {
        this.live.set(this.job.i, r.value);
        this.job = null;
      }
    }
    this.lastMs = this.clock() - t0;
    this.maxMs = Math.max(this.maxMs, this.lastMs);
  }

  /** Drop every chunk (leaving free roam). */
  clear(): void {
    for (const [i, c] of this.live) this.dispose(i, c);
    this.live.clear();
    this.wanted = [];
    this.job = null;
    this.cell = -1;
  }

  private retarget(cx: number, cz: number, cell: number): void {
    this.cell = cell;
    const far = (i: number, r: number): boolean => Math.max(Math.abs((i % this.n) - cx), Math.abs(Math.floor(i / this.n) - cz)) > r;
    for (const [i, c] of this.live) {
      if (far(i, this.keep)) { this.dispose(i, c); this.live.delete(i); }
    }
    if (this.job && far(this.job.i, this.keep)) this.job = null;
    const w: number[] = [];
    for (let z = Math.max(0, cz - this.radius); z <= Math.min(this.n - 1, cz + this.radius); z++) {
      for (let x = Math.max(0, cx - this.radius); x <= Math.min(this.n - 1, cx + this.radius); x++) {
        const i = z * this.n + x;
        if (!this.live.has(i) && this.job?.i !== i) w.push(i);
      }
    }
    w.sort((a, b) => Math.hypot((a % this.n) - cx, Math.floor(a / this.n) - cz) - Math.hypot((b % this.n) - cx, Math.floor(b / this.n) - cz));
    this.wanted = w;
  }
}
