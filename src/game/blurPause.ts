export interface BlurFacts {
  /** A mouse-style pointer (desktop). Touch devices fire blur for harmless reasons, so they are skipped. */
  finePointer: boolean;
  /** Driven by an automated browser (tests, bots): never pause them. */
  automated: boolean;
  /** `document.hasFocus()` sampled a moment after the blur event. */
  stillFocused: boolean;
}

/**
 * Alt-tab on a desktop must not leave the car driving into a wall: a window blur pauses the race.
 * Blur also fires when focus only moves inside the page (an iframe, a dialog), hence the re-check of `hasFocus`.
 */
export function shouldPauseOnBlur(f: BlurFacts): boolean {
  return f.finePointer && !f.automated && !f.stillFocused;
}
