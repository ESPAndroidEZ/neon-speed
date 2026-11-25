/**
 * Intelligent Driver Model (Treiber et al. 2000; values close to the common game / research defaults, see
 * docs/research-open-world.md): the acceleration of a car that wants speed v0, with a leader `gap` metres ahead
 * (bumper to bumper) closing at `dv` m/s (own speed minus the leader's). A stop line is a leader standing still.
 * Smooth starts, smooth stops, and no snapping to a target speed. Pure.
 */
export const IDM = { a: 2.2, b: 3.2, s0: 3, T: 1.1, len: 5.5, maxBrake: 8 } as const; // len: centre to bumper of two cars (traffic shapes up to 5 m); s0, len swept on the traffic check (2 close pairs vs 4 before)

export function idmAccel(v: number, v0: number, gap: number, dv: number): number {
  const free = v0 > 0.1 ? 1 - (v / v0) ** 4 : -1;
  if (!(gap < 1e6)) return Math.max(-IDM.maxBrake, IDM.a * free);
  const want = IDM.s0 + Math.max(0, v * IDM.T + (v * dv) / (2 * Math.sqrt(IDM.a * IDM.b)));
  const k = want / Math.max(0.2, gap);
  return Math.max(-IDM.maxBrake, Math.min(IDM.a, IDM.a * (free - k * k)));
}
