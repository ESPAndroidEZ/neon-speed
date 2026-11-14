import type { BufferGeometry } from 'three';
import { loft, type HalfRing } from './carLoft';

/** Proportion data for one body style (metres). Pure data; names and brands live in data/cars.ts. */
export interface BodyShape {
  length: number;
  width: number;
  /** Roof height above ground. */
  height: number;
  /** Nose to base of windshield. */
  hoodLength: number;
  /** Horizontal run of the windshield and the rear window. */
  windshieldRun: number;
  rearWindowRun: number;
  /** Length of the flat roof. */
  roofLength: number;
  /** Beltline (door top) height. */
  beltHeight: number;
  wheelbase: number;
  wheelRadius: number;
  spoiler: 'none' | 'lip' | 'wing';
  /** Rear haunch bulge (0..0.12): wider shoulders over the rear wheels. */
  haunch: number;
  /** How far the nose is lowered (m): low sports noses. */
  noseLow: number;
  /** Raised hood scoop. */
  scoop: boolean;
}

export const RIDE = 0.2;
type Poly = readonly (readonly [number, number])[];

/** Chaikin corner cutting on an open polyline (endpoints kept). */
function smoothOpen(p: Poly, passes: number): [number, number][] {
  let a = p.map((q) => [q[0], q[1]] as [number, number]);
  for (let k = 0; k < passes; k++) {
    const o: [number, number][] = [a[0]];
    for (let i = 0; i < a.length - 1; i++) {
      o.push([a[i][0] * 0.75 + a[i + 1][0] * 0.25, a[i][1] * 0.75 + a[i + 1][1] * 0.25], [a[i][0] * 0.25 + a[i + 1][0] * 0.75, a[i][1] * 0.25 + a[i + 1][1] * 0.75]);
    }
    o.push(a[a.length - 1]);
    a = o;
  }
  return a;
}

/** y at z on a polyline sorted by DESCENDING z (nose first). */
function at(p: Poly, z: number): number {
  if (z >= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) {
    if (z <= p[i][0] && z >= p[i + 1][0]) {
      const t = (p[i][0] - z) / (p[i][0] - p[i + 1][0] || 1);
      return p[i][1] + (p[i + 1][1] - p[i][1]) * t;
    }
  }
  return p[p.length - 1][1];
}

const ss = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Station z positions, denser at both ends where the curvature is. */
function stations(from: number, to: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => from + (to - from) * (0.5 - 0.5 * Math.cos((i / (n - 1)) * Math.PI)));
}

export interface BodyParts {
  /** Lower body, hood, deck and bumpers: paint. */
  shell: BufferGeometry;
  /** Greenhouse: material groups 0 = glass, 1 = painted roof. */
  cabin: BufferGeometry;
  /** Z of the windshield base and of the rear end of the cabin (for details). */
  zWindshield: number;
  zCabinEnd: number;
  /** Hood height at z (for the scoop). */
  hoodY: (z: number) => number;
  /** Half width of the shell at z. */
  halfWidth: (z: number) => number;
}

/**
 * Lofted body: cross-sections along the length (width, height, roofline and beltline curves), mirrored, with smooth
 * normals. The silhouette comes from the proportion numbers (hood length, roof and window runs, haunch, nose drop).
 */
export function buildBody(s: BodyShape): BodyParts {
  const zf = s.length / 2;
  const B = s.beltHeight;
  const zw = zf - s.hoodLength;
  const zr = zw - s.windshieldRun - s.roofLength - s.rearWindowRun;
  const d = Math.max(0.12, zr + zf); // length of deck behind the cabin
  const nt = RIDE + 0.5 - s.noseLow;
  const shellTop = smoothOpen([
    [zf, RIDE + 0.3], [zf - 0.1, nt], [zf - s.hoodLength * 0.45, nt + (B - nt) * 0.5], [zw, B - 0.01], [zr, B - 0.01],
    [zr - d * 0.3, B - 0.03], [zr - d * 0.75, B - 0.1], [-zf, RIDE + 0.46],
  ], 2);
  const cabinTop = smoothOpen([[zw, B], [zw - s.windshieldRun, s.height], [zw - s.windshieldRun - s.roofLength, s.height - 0.015], [zr, B + 0.03]], 2);
  const halfW = (z: number): number => {
    const nose = 0.6 + 0.4 * ss(0, 0.9, zf - z);
    const tail = 0.72 + 0.28 * ss(0, 0.7, z + zf);
    const haunch = 1 + s.haunch * Math.exp(-(((z + s.wheelbase / 2) / 0.9) ** 2));
    return (s.width / 2) * nose * tail * haunch;
  };
  const shell = loft(stations(-zf, zf, 34), (z): HalfRing => {
    const w = halfW(z);
    const y0 = RIDE;
    const h = Math.max(0.1, at(shellTop, z) - y0);
    return [[0, y0], [w * 0.78, y0], [w * 0.95, y0 + 0.18 * h], [w, y0 + 0.42 * h], [w, y0 + 0.72 * h], [w * 0.95, y0 + 0.93 * h], [w * 0.74, y0 + h], [0, y0 + h]];
  }, { closed: true, uvScale: 0.3 });
  const cabin = loft(stations(zr, zw, 22), (z): HalfRing => {
    const top = at(cabinTop, z);
    const h = Math.max(0, top - B);
    const wb = halfW(z) * 0.9;
    const wt = wb * 0.8;
    return [[wb, B - 0.02], [wb * 0.97, B + 0.45 * h], [wt, B + 0.85 * h], [wt * 0.72, B + h], [0, B + h]];
  }, { closed: false, uvScale: 0.3, segmentGroups: [0, 0, 1, 1] });
  return { shell, cabin, zWindshield: zw, zCabinEnd: zr, hoodY: (z) => at(shellTop, z), halfWidth: halfW };
}
