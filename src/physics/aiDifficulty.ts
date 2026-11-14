/** AI difficulty levels and personalities. Pure data: the AI reads these, nothing else changes between levels. */
export type Difficulty = 'ROOKIE' | 'STREET' | 'PRO' | 'LEGEND';
export const DIFFICULTIES: readonly Difficulty[] = ['ROOKIE', 'STREET', 'PRO', 'LEGEND'];

export type DriveStyle = 'clean' | 'blocker' | 'drifter' | 'late-braker' | 'aggressive';

export interface Level {
  /** Multiplies the rival's own skill, then `bonus` is added: above 1 the driver trusts more grip, braking and traction than a Street skill-1 driver. */
  skillMul: number;
  bonus: number;
  /** Overall pace multiplier on the speed targets (kept at 1 for the strong levels: they win through skill, not through speed offsets). */
  pace: number;
  /**
   * Rubber band: at most this fraction of extra (behind the player) or less (far ahead) speed target. It never changes grip,
   * power or braking, only how hard the driver pushes, and it shrinks with the level: Legend has none.
   */
  rubber: number;
  /** Chance per second of a small lapse (a missed apex, a late brake). */
  lapse: number;
  /** 0..1: how willing the driver is to pass with a dive-bomb or side by side. */
  overtake: number;
  /** 0..1: how hard the driver defends a position from a car behind. */
  block: number;
  /** Uses nitro on purpose (long straights, when chasing, on the last lap). */
  smartNitro: boolean;
}

/** The hard cap on any rubber band, asserted by tests/ai-levels-check. */
export const RUBBER_MAX = 0.09;

export const LEVELS: Record<Difficulty, Level> = {
  ROOKIE: { skillMul: 0.82, bonus: -0.03, pace: 0.95, rubber: 0.09, lapse: 0.06, overtake: 0.25, block: 0, smartNitro: false },
  STREET: { skillMul: 1, bonus: 0, pace: 1, rubber: 0.05, lapse: 0.02, overtake: 0.6, block: 0.25, smartNitro: false },
  PRO: { skillMul: 1.06, bonus: 0.04, pace: 1, rubber: 0.025, lapse: 0.006, overtake: 0.9, block: 0.7, smartNitro: true },
  LEGEND: { skillMul: 1.12, bonus: 0.09, pace: 1, rubber: 0, lapse: 0, overtake: 1, block: 1, smartNitro: true },
};

export interface Style {
  /** Multiplier on the braking deceleration the driver trusts (late brakers > 1). */
  brake: number;
  /** Multiplier on cornering speed. */
  corner: number;
  /** Defence and attack weights relative to the level. */
  block: number;
  overtake: number;
  /** Slides do not shake this driver's confidence: it keeps carrying speed through them. */
  drifts: boolean;
}

export const STYLES: Record<DriveStyle, Style> = {
  clean: { brake: 1, corner: 1, block: 0.6, overtake: 1, drifts: false },
  blocker: { brake: 1, corner: 0.99, block: 1.6, overtake: 0.5, drifts: false },
  drifter: { brake: 0.97, corner: 1.02, block: 0.4, overtake: 0.9, drifts: true },
  'late-braker': { brake: 1.14, corner: 0.99, block: 0.5, overtake: 1.4, drifts: false },
  aggressive: { brake: 1.04, corner: 1.02, block: 1, overtake: 1.3, drifts: false },
};
