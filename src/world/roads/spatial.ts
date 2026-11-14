/** Uniform grid hash over the world square: ids are filed under every cell their box touches. Queries never allocate. */
export class GridHash {
  readonly cell: number;
  readonly n: number;
  private readonly half: number;
  private readonly cells: number[][];
  private static readonly EMPTY: readonly number[] = [];

  constructor(half: number, cell: number) {
    this.half = half;
    this.cell = cell;
    this.n = Math.ceil((half * 2) / cell);
    this.cells = new Array<number[]>(this.n * this.n);
  }

  private idx(v: number): number {
    return Math.min(this.n - 1, Math.max(0, Math.floor((v + this.half) / this.cell)));
  }

  insert(id: number, minX: number, minZ: number, maxX: number, maxZ: number): void {
    const [x0, x1, z0, z1] = [this.idx(minX), this.idx(maxX), this.idx(minZ), this.idx(maxZ)];
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) (this.cells[z * this.n + x] ??= []).push(id);
  }

  /** Ids filed under the cell that holds (x, z). */
  at(x: number, z: number): readonly number[] {
    return this.cells[this.idx(z) * this.n + this.idx(x)] ?? GridHash.EMPTY;
  }
}
