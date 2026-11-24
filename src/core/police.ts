/**
 * Heat (docs/nfs-vision.md section 2): the police chase rules in Free Drive. Pure state; the cars are physics/roamPolice and the
 * orchestration game/roamHeat. Level 0 is quiet, 1 to 3 send that many cars. A cop that stays close while you are slow
 * fills the BUSTED meter; staying far away long enough is an ESCAPE.
 */
export const MAX_HEAT = 3;
/** Metres: a cop this close counts; and the speed (m/s) below which it can arrest. */
export const BUST_R = 14, BUST_SPEED = 22;
/** Seconds of being caught to get busted, and of being clear to escape; clear = this far from every cop (m). */
export const BUST_TIME = 4, ESCAPE_TIME = 7, ESCAPE_R = 130;
/** A speed camera flash at this speed (km/h) or faster calls the police. */
export const WANTED_KMH = 200;

export type HeatEvent = 'none' | 'busted' | 'escaped';

/** Cars sent at a heat level. */
export const copsFor = (level: number): number => Math.max(0, Math.min(MAX_HEAT, level));
/** The fine for being busted: 6 % of the cash, between 250 and 3000, in steps of 50. */
export const fineFor = (cash: number): number => Math.min(3000, Math.max(250, Math.round((cash * 0.06) / 50) * 50));
/** The prize for an escape. */
export const escapeCash = (level: number): number => 600 * level;
export const escapeRep = (level: number): number => 50 * level;

export class Heat {
  level = 0;
  /** 0..1, 1 = busted. */
  bust = 0;
  private calm = 0;

  /** More heat (max 3); true when the level went up. */
  raise(n = 1): boolean {
    const was = this.level;
    this.level = Math.min(MAX_HEAT, this.level + n);
    if (was === 0) { this.bust = 0; this.calm = 0; }
    return this.level > was;
  }

  reset(): void { this.level = 0; this.bust = 0; this.calm = 0; }

  /** Every step: your speed and the distance to the nearest cop (Infinity when none). */
  step(dt: number, speed: number, nearest: number): HeatEvent {
    if (this.level === 0) return 'none';
    if (nearest < BUST_R && speed < BUST_SPEED) this.bust = Math.min(1, this.bust + dt / BUST_TIME);
    else this.bust = Math.max(0, this.bust - dt / (BUST_TIME * 1.5));
    this.calm = nearest > ESCAPE_R ? this.calm + dt : 0;
    if (this.bust >= 1) { this.reset(); return 'busted'; }
    if (this.calm >= ESCAPE_TIME) { this.reset(); return 'escaped'; }
    return 'none';
  }
}
