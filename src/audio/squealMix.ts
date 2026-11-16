/** Which tyre-noise voices are open, from the weather and the surface under the car. Pure: the caller scales its voices. */
export interface SquealMix { dry: number; dryHi: number; wet: number; wetHi: number; snow: number }

const OUT: SquealMix = { dry: 0, dryHi: 0, wet: 0, wetHi: 0, snow: 0 }; // reused, the caller reads it at once

/**
 * Weather picks the base voice (clear = squeal, rain = hissy spray, snow = crunch), exactly as before.
 * A puddle turns any weather into spray, snow banks into crunch, and ice is quiet and thin (nothing to scrub).
 */
export function squealMix(weather: string, surface: string): SquealMix {
  const clear = weather === 'CLEAR' ? 1 : 0, rain = weather === 'RAIN' ? 1 : 0, snow = weather === 'SNOW' ? 1 : 0;
  OUT.dry = clear; OUT.dryHi = clear; OUT.wet = rain; OUT.wetHi = rain; OUT.snow = snow;
  if (surface === 'puddle') {
    OUT.dry = clear * 0.25; OUT.dryHi = clear * 0.25; OUT.snow = snow * 0.4; OUT.wet = 1; OUT.wetHi = 1;
  } else if (surface === 'snowbank') {
    OUT.dry *= 0.2; OUT.dryHi *= 0.2; OUT.wet *= 0.2; OUT.wetHi *= 0.2; OUT.snow = 1;
  } else if (surface === 'ice') {
    OUT.dry *= 0.4; OUT.wet *= 0.4; OUT.snow *= 0.5;
    OUT.dryHi *= 0.8; OUT.wetHi *= 0.8; // the thin part stays, the body goes
  }
  return OUT;
}
