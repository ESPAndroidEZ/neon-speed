import { BoxGeometry, CylinderGeometry, Mesh, TorusGeometry, type MeshStandardMaterial, type Object3D } from 'three';

/**
 * Rim designs. A builder returns the face parts of one wheel (spokes, lips, bolts) in wheel space: axle along X, `face` is the X of
 * the outer face, `r` the tyre radius. Add a design by adding a key here (see docs/tasks: 12 rim designs). 'five' and 'multi' are the
 * reference implementations: parts only, shared geometry per call, no animation.
 */
export type RimBuilder = (r: number, face: number, rim: MeshStandardMaterial) => Object3D[];

const spokes = (n: number, r: number, face: number, rim: MeshStandardMaterial, w: number, len: number, depth: number, twist = 0): Object3D[] => {
  const geo = new BoxGeometry(depth, len, w);
  const out: Object3D[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = new Mesh(geo, rim);
    s.position.set(face, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
    s.rotation.x = -a + twist;
    out.push(s);
  }
  return out;
};

export const RIM_DESIGNS: Record<string, RimBuilder> = {
  /** Five fat spokes. */
  five: (r, face, rim) => {
    const lip = new Mesh(new TorusGeometry(r * 0.64, 0.014, 6, 28).rotateY(Math.PI / 2), rim);
    lip.position.x = face;
    return [...spokes(5, r, face, rim, r * 0.1, r * 0.6, 0.035), lip];
  },
  /** Ten slim spokes with a polished lip ring. */
  multi: (r, face, rim) => {
    const lip = new Mesh(new TorusGeometry(r * 0.64, 0.012, 6, 28).rotateY(Math.PI / 2), rim);
    lip.position.x = face;
    return [...spokes(10, r, face, rim, r * 0.05, r * 0.52, 0.03), lip];
  },
};

export const RIM_IDS = Object.keys(RIM_DESIGNS);

/** A flat centre cap, shared by every design. */
export const centreCap = (r: number, face: number, rim: MeshStandardMaterial): Mesh => {
  const hub = new Mesh(new CylinderGeometry(r * 0.12, r * 0.12, 0.05, 10).rotateZ(Math.PI / 2), rim);
  hub.position.x = face;
  return hub;
};
