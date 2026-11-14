import { smoothstep } from '../../core/math';

/** Sea level, the flat harbour apron and the height of the north-east cliff top (m). */
export const SEA_Y = 0;
export const QUAY_Y = 1.6;
const HILL = 34;

const wave = (x: number, z: number): number => Math.sin(x * 0.0061 + 1.3) * Math.cos(z * 0.0053 - 0.4) + 0.5 * Math.sin((x + z) * 0.0098 + 2.1);

/**
 * Ground height at a world point: a flat quay in the south, a gently rolling city, and a hill that climbs to the
 * north-east for the cliff road. Smooth (no feature shorter than ~150 m), so a 16 m ground grid follows it within
 * a few centimetres. Pure and allocation free: physics, meshes and traffic all call it.
 */
export function heightAt(x: number, z: number): number {
  const inland = smoothstep(-640, -330, z); // 0 on the quay, 1 in the city
  const hill = smoothstep(120, 700, x) * smoothstep(-80, 660, z);
  const roll = 2.2 * wave(x, z) * inland * (1 - 0.6 * hill);
  return QUAY_Y + inland * 3.4 + roll + HILL * hill * hill * (3 - 2 * hill);
}

/** Slope along a heading (rise over run), for the car's pitch. */
export function slopeAlong(x: number, z: number, heading: number): number {
  const dx = Math.sin(heading) * 2;
  const dz = Math.cos(heading) * 2;
  return (heightAt(x + dx, z + dz) - heightAt(x - dx, z - dz)) / 4;
}
