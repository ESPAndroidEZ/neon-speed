/** Gamepad menu navigation, pure part: turns held buttons into fire-once-then-repeat presses. Allocation free. */
export const PAD_UP = 1, PAD_DOWN = 2, PAD_LEFT = 4, PAD_RIGHT = 8, PAD_OK = 16, PAD_BACK = 32;
const REPEATABLE = PAD_UP | PAD_DOWN | PAD_LEFT | PAD_RIGHT;
const FIRST_DELAY = 0.4; // s before a held direction repeats
const REPEAT = 0.12;

export interface PadNavState {
  /** Bits held on the previous update. */
  held: number;
  /** Seconds a direction has been held. */
  hold: number;
  /** Next repeat time (hold seconds). */
  next: number;
}

export function newPadNav(): PadNavState {
  return { held: 0, hold: 0, next: FIRST_DELAY };
}

/** Call when the menu becomes active: buttons already down (the handbrake from the race) must not fire. */
export function primePadNav(s: PadNavState, down: number): void {
  s.held = down;
  s.hold = 0;
  s.next = FIRST_DELAY;
}

/** `down` = bits held now. Returns the bits that fire this update: new presses, plus repeats of held directions. */
export function stepPadNav(s: PadNavState, dt: number, down: number): number {
  let fire = down & ~s.held;
  const dirs = down & REPEATABLE;
  if (dirs === 0 || dirs !== (s.held & REPEATABLE)) {
    s.hold = 0;
    s.next = FIRST_DELAY;
  } else {
    s.hold += dt;
    if (s.hold >= s.next) {
      s.next += REPEAT;
      fire |= dirs;
    }
  }
  s.held = down;
  return fire;
}

/** Standard-mapping pad to bits: d-pad (12..15) or left stick, A (0) to confirm, B (1) to go back. */
export function padBits(buttons: ArrayLike<{ pressed: boolean }>, axes: ArrayLike<number>): number {
  const p = (i: number): boolean => i < buttons.length && buttons[i].pressed;
  const ax = axes.length > 0 ? axes[0] : 0;
  const ay = axes.length > 1 ? axes[1] : 0;
  let b = 0;
  if (p(12) || ay < -0.6) b |= PAD_UP;
  if (p(13) || ay > 0.6) b |= PAD_DOWN;
  if (p(14) || ax < -0.6) b |= PAD_LEFT;
  if (p(15) || ax > 0.6) b |= PAD_RIGHT;
  if (p(0)) b |= PAD_OK;
  if (p(1)) b |= PAD_BACK;
  return b;
}
