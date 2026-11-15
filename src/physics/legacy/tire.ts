/**
 * Pacejka-style lateral tyre force. Rises with slip angle, peaks, then eases off to
 * about 70% of peak (for C = 1.5): that falloff is what lets the tail step out.
 * Returns a force that OPPOSES the slip (positive slip -> negative force).
 */
export function tireLateral(slip: number, load: number, mu: number, B: number, C: number): number {
  return -mu * load * Math.sin(C * Math.atan(B * slip));
}
