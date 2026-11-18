import { smoothstep } from '../../core/math';

/** Sea level and the flat harbour quay (m). */
export const SEA_Y = 0;
export const QUAY_Y = 1.6;

const wave = (x: number, z: number): number => Math.sin(x * 0.0021 + 1.3) * Math.cos(z * 0.0019 - 0.4) + 0.5 * Math.sin((x + z) * 0.0034 + 2.1);

/**
 * Ground height at a world point: a flat quay along the harbour, a gently rolling city (+-3 m), and the hills climbing
 * north to about 70 m (the viewpoints over the skyline). Smooth (no feature shorter than ~400 m), so road ribbons and a
 * coarse ground grid follow it closely. Pure and allocation free: physics, meshes and traffic all call it.
 */
export function heightAt(x: number, z: number): number {
  const inland = smoothstep(-1500, -1100, z); // 0 on the quay (harbour), 1 in the city
  const hills = smoothstep(1000, 2900, z);
  const east = smoothstep(1800, 2600, x); // the airfield stays flat
  const roll = 3 * wave(x, z) * inland * (1 - 0.5 * east);
  return QUAY_Y + inland * 2.4 + roll + 68 * hills * hills * (3 - 2 * hills) * (1 - east * 0.85) + 18 * hills * wave(x * 2.3, z * 2.1) * (1 - east);
}

/** Slope along a heading (rise over run), for the car's pitch. */
export function slopeAlong(x: number, z: number, heading: number): number {
  const dx = Math.sin(heading) * 2;
  const dz = Math.cos(heading) * 2;
  return (heightAt(x + dx, z + dz) - heightAt(x - dx, z - dz)) / 4;
}
