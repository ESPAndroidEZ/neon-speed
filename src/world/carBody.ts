import { BufferGeometry, ExtrudeGeometry, Shape } from 'three';

/** Side-profile numbers for one body style (metres). Pure data; names and brands live in data/cars.ts. */
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
}

const RIDE = 0.2;

/** Extrude a (z, y) profile across `width` (centred on x = 0). Shape x = z, bevelled for a soft low-poly look. */
function extrudeProfile(pts: readonly (readonly [number, number])[], width: number, bevel: number): BufferGeometry {
  const s = new Shape();
  pts.forEach(([z, y], i) => (i === 0 ? s.moveTo(-z, y) : s.lineTo(-z, y)));
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 });
  g.rotateY(Math.PI / 2); // shape x -> -z... see below: after rotation shape x maps to car z
  g.translate(-(width - bevel * 2) / 2, 0, 0);
  return g;
}

/** Lower body: bumper to bumper, up to the beltline. */
export function bodyShell(s: BodyShape): BufferGeometry {
  const zf = s.length / 2;
  const belt = s.beltHeight;
  return extrudeProfile(
    [
      [zf, RIDE + 0.12], [zf, RIDE + 0.45], [zf - 0.45, RIDE + 0.62], [zf - s.hoodLength, belt],
      [-zf + 0.7, belt - 0.02], [-zf + 0.12, belt - 0.1], [-zf, RIDE + 0.55], [-zf, RIDE + 0.12],
    ],
    s.width,
    0.07,
  );
}

/** Greenhouse (glass) above the beltline, narrower than the body. */
export function cabin(s: BodyShape): BufferGeometry {
  const z0 = s.length / 2 - s.hoodLength;
  const z1 = z0 - s.windshieldRun;
  const z2 = z1 - s.roofLength;
  const z3 = z2 - s.rearWindowRun;
  const belt = s.beltHeight - 0.02;
  return extrudeProfile([[z0, belt], [z1, s.height], [z2, s.height], [z3, belt]], s.width * 0.84, 0.05);
}

/** Z range of the flat roof, for the painted roof panel. */
export function roofSpan(s: BodyShape): [number, number] {
  const z1 = s.length / 2 - s.hoodLength - s.windshieldRun;
  return [z1, z1 - s.roofLength];
}
