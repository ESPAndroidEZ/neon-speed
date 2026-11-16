/**
 * Fires once per race when rain or snow has built up enough to cost grip (display only).
 * A race that is first seen already past the threshold (restored save) never fires; only a real crossing does.
 */
export const WEATHER_CUE_AT = 0.5;

export class WeatherCue {
  private prev = -1;

  /** Call every frame while racing; true on the frame the build-up crosses the threshold. */
  step(bad: boolean, intensity: number): boolean {
    const was = this.prev;
    this.prev = intensity;
    return bad && was >= 0 && was < WEATHER_CUE_AT && intensity >= WEATHER_CUE_AT;
  }

  /** New race or restart. */
  reset(): void {
    this.prev = -1;
  }
}
