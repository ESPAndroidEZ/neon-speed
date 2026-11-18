import type { CarController } from '../physics/carController';
import { COMBO, StyleCombo, type ComboData } from './styleCombo';
import type { TrackContact } from '../physics/trackContact';
import { racingLine, type RacingLine } from '../physics/aiLine';
import type { TrackSample } from '../types/game';

/** Racer fields the rewards read (structural, so tests can pass plain objects). */
export interface RewardRacer { car: CarController; contact: TrackContact; isPlayer: boolean; finished: boolean }
export type RewardKind = 'NEAR MISS' | 'SLIPSTREAM' | 'CLEAN CORNER';
export interface RewardData { slip: number; inCorner: boolean; cornerHit: boolean; side: number[]; seq: number; last: RewardKind | null; combo?: ComboData }

/** Nitro paid per reward (fraction of a full tank), and the slipstream tow. */
export const REWARD = { nearMiss: 0.12, cleanCorner: 0.08, slipPerSec: 0.1, slipPush: 1.2 };

/**
 * Risk and reward for the player, paid in nitro:
 * - NEAR MISS: overtake a car within 2.6 m side gap at > 18 m/s without touching it;
 * - SLIPSTREAM: 4-25 m behind a car and within 2.2 m of its line at > 20 m/s: nitro trickles in and the tow adds a push;
 * - CLEAN CORNER: through a sharp corner (racing line radius < 30 m) without touching a wall.
 * Deterministic, allocation free per step, snapshot/restore for saves. `seq`/`last` tell the HUD what to pop up.
 */
export class RaceRewards {
  slip = 0;
  inCorner = false;
  cornerHit = false;
  /** Per racer: which side of the player it was last step, +1 ahead / -1 behind / 0 unknown. */
  side = new Float32Array(16);
  seq = 0;
  last: RewardKind | null = null;
  /** Style combo chained from these rewards and banked drifts (core/styleCombo). */
  readonly combo = new StyleCombo();
  private line: RacingLine | null = null;
  private samples: readonly TrackSample[] | null = null;

  reset(): void {
    this.slip = 0; this.inCorner = false; this.cornerHit = false; this.side.fill(0); this.seq = 0; this.last = null;
    this.combo.reset();
  }

  private pay(car: CarController, amount: number, kind: RewardKind): void {
    const d = car.drivetrain;
    d.nitroLevel = Math.min(1, d.nitroLevel + amount);
    this.last = kind;
    this.seq++;
    this.combo.link(kind === 'NEAR MISS' ? COMBO.nearMiss : COMBO.cleanCorner);
  }

  step(dt: number, racers: readonly RewardRacer[], samples: readonly TrackSample[], carImpact: number): void {
    let me: RewardRacer | null = null;
    for (const r of racers) if (r.isPlayer) me = r;
    if (!me || me.finished) return;
    const dr = me.car.drift;
    this.combo.step(dt, dr.bank, dr.chain > 0, Math.max(carImpact, me.contact.impact));
    const s = me.car.state, v = s.speed;
    const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
    let towing = false;
    for (let i = 0; i < racers.length && i < this.side.length; i++) {
      const o = racers[i];
      if (o === me) continue;
      const dx = o.car.state.position.x - s.position.x, dz = o.car.state.position.z - s.position.z;
      const along = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
      const now = along > 0 ? 1 : -1;
      if (this.side[i] > 0 && now < 0 && lat < 2.6 && v > 18 && carImpact < 0.5 && Math.abs(along) < 8) this.pay(me.car, REWARD.nearMiss, 'NEAR MISS');
      this.side[i] = Math.abs(along) < 40 ? now : 0;
      if (along > 4 && along < 25 && lat < 2.2 && v > 20) towing = true;
    }
    if (towing) {
      const was = this.slip;
      this.slip += dt;
      me.car.drivetrain.nitroLevel = Math.min(1, me.car.drivetrain.nitroLevel + REWARD.slipPerSec * dt);
      me.car.u += REWARD.slipPush * dt;
      if (was < 0.6 && this.slip >= 0.6) { this.last = 'SLIPSTREAM'; this.seq++; this.combo.link(COMBO.slipstream); }
    } else this.slip = 0;

    if (samples !== this.samples) { this.samples = samples; this.line = racingLine(samples, 1.7); }
    const l = this.line;
    if (!l) return;
    const k = l.k[me.contact.hit.index % l.n];
    if (!this.inCorner && k > 1 / 30 && v > 6) { this.inCorner = true; this.cornerHit = false; }
    if (this.inCorner && me.contact.impact > 1) this.cornerHit = true;
    if (this.inCorner && k < 1 / 45) {
      this.inCorner = false;
      if (!this.cornerHit && v > 8) this.pay(me.car, REWARD.cleanCorner, 'CLEAN CORNER');
    }
  }

  snapshot(): RewardData {
    return { slip: this.slip, inCorner: this.inCorner, cornerHit: this.cornerHit, side: Array.from(this.side), seq: this.seq, last: this.last, combo: this.combo.snapshot() };
  }

  restore(d: RewardData | undefined): void {
    this.reset();
    if (!d) return;
    this.slip = d.slip; this.inCorner = d.inCorner; this.cornerHit = d.cornerHit; this.side.set(d.side.slice(0, 16));
    this.seq = d.seq; this.last = d.last;
    this.combo.restore(d.combo);
  }
}
