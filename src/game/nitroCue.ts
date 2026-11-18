/**
 * Nitro tank cues (display only): "EMPTY" when a burn runs the tank dry, then "READY" once drifting
 * and clean driving have refilled it to half. Strict alternation, so it can never spam.
 * A tank first seen low (restored save) says nothing until it has really been emptied by the player.
 */
export type NitroCueKind = 'EMPTY' | 'READY' | null;

export const NITRO_EMPTY_AT = 0.02;
export const NITRO_READY_AT = 0.5;

export class NitroCue {
  private empty = false;
  private burned = false; // the player burned nitro since the last cue (the tank may read 0 a frame after the burn ends)

  /** Every frame while racing: `active` is the nitro burning this frame. */
  step(level: number, active: boolean): NitroCueKind {
    if (active) this.burned = true;
    if (!this.empty) {
      if (this.burned && level <= NITRO_EMPTY_AT) { this.empty = true; this.burned = false; return 'EMPTY'; }
      return null;
    }
    if (level >= NITRO_READY_AT) { this.empty = false; return 'READY'; }
    return null;
  }

  /** New race or restart. */
  reset(): void {
    this.empty = false;
    this.burned = false;
  }
}
