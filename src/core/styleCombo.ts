/** What the combo saves (part of the reward snapshot). */
export interface ComboData { mult: number; timer: number; chain: number; score: number; best: number; bank: number; seq: number }

/** Style points per event (before the multiplier); a banked drift adds its drift score / 10. */
export const COMBO = { window: 3, maxMult: 5, nearMiss: 100, slipstream: 150, cleanCorner: 120, driftDiv: 10, crash: 0.8 } as const;

/**
 * Style combo: near misses, slipstreams, clean corners and banked drifts within `window` seconds of each other chain
 * up; every link raises the multiplier (x1..x5) and adds points x multiplier. A drift in progress holds the timer.
 * When the timer runs out the chain banks into `score`; a hard crash loses the unbanked chain. Pure, deterministic,
 * stepped by RaceRewards in the fixed step, no allocation. `seq` tells the HUD that something changed.
 */
export class StyleCombo {
  mult = 1;
  timer = 0;
  /** Unbanked points of the running chain. */
  chain = 0;
  /** Banked style points this race. */
  score = 0;
  /** Biggest single chain this race. */
  best = 0;
  private bank = 0;
  seq = 0;
  /** Last change for the HUD: 'link' (multiplier up), 'banked', 'broken' or null. */
  event: 'link' | 'banked' | 'broken' | null = null;

  reset(): void {
    this.mult = 1; this.timer = 0; this.chain = 0; this.score = 0; this.best = 0; this.bank = 0; this.seq = 0; this.event = null;
  }

  /** One linked event worth `points` (before the multiplier). */
  link(points: number): void {
    if (this.timer <= 0) this.mult = 1;
    this.chain += points * this.mult;
    this.mult = Math.min(COMBO.maxMult, this.mult + 1);
    this.timer = COMBO.window;
    this.note('link');
  }

  /** Per fixed step: `driftBank` = the drift scorer's banked total, `drifting` holds the timer, `impact` breaks it. */
  step(dt: number, driftBank: number, drifting: boolean, impact: number): void {
    if (driftBank > this.bank) this.link((driftBank - this.bank) / COMBO.driftDiv);
    this.bank = driftBank;
    if (impact > COMBO.crash && this.chain > 0) {
      this.chain = 0; this.timer = 0; this.mult = 1;
      this.note('broken');
      return;
    }
    if (this.timer <= 0) return;
    if (!drifting) this.timer -= dt;
    if (this.timer <= 0) {
      this.chain = Math.round(this.chain);
      this.score += this.chain;
      this.best = Math.max(this.best, this.chain);
      this.chain = 0; this.mult = 1; this.timer = 0;
      this.note('banked');
    }
  }

  private note(e: 'link' | 'banked' | 'broken'): void {
    this.event = e;
    this.seq++;
  }

  snapshot(): ComboData {
    return { mult: this.mult, timer: this.timer, chain: this.chain, score: this.score, best: this.best, bank: this.bank, seq: this.seq };
  }

  restore(d: ComboData | undefined): void {
    this.reset();
    if (!d) return;
    const n = (v: unknown, def = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : def);
    this.mult = Math.min(COMBO.maxMult, Math.max(1, n(d.mult, 1))); this.timer = n(d.timer); this.chain = n(d.chain);
    this.score = n(d.score); this.best = n(d.best); this.bank = n(d.bank); this.seq = n(d.seq);
  }
}
