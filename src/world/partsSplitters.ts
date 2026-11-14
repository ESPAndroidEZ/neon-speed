import { BoxGeometry, Group, Mesh, type Material } from 'three';
import type { PartBuilder } from './carParts';

const box = (w: number, h: number, d: number, m: Material, x: number, y: number, z: number): Mesh => {
  const b = new Mesh(new BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
};

export const SPLITTER_MORE: Record<string, PartBuilder> = {
  /** Wide flat lip with a raised front edge. */
  'lip-wide': (a, _paint, trim) => {
    const g = new Group();
    g.add(box(a.width * 0.98, 0.03, 0.4, trim, 0, 0.06, a.length / 2 - 0.04));
    g.add(box(a.width * 0.98, 0.03, 0.06, trim, 0, 0.09, a.length / 2 - 0.24));
    return g;
  },
  /** Central plate with two tall end fins. */
  'dual-fin': (a, _paint, trim) => {
    const g = new Group();
    g.add(box(a.width * 0.6, 0.04, 0.3, trim, 0, 0.08, a.length / 2 - 0.06));
    for (const s of [1, -1]) g.add(box(0.04, 0.12, 0.26, trim, s * a.width * 0.46, 0.1, a.length / 2 - 0.08));
    return g;
  },
  /** Small angled canard plates on the front corners. */
  canard: (a, paint, _trim) => {
    const g = new Group();
    for (const s of [1, -1]) {
      const c = box(0.12, 0.03, 0.2, paint, s * a.width * 0.42, 0.1, a.length / 2 - 0.12);
      c.rotation.y = s * 0.3;
      g.add(c);
    }
    return g;
  },
  /** Wide snow-plow wedge with a raised lip. */
  plow: (a, _paint, trim) => {
    const g = new Group();
    g.add(box(a.width * 0.92, 0.08, 0.36, trim, 0, 0.06, a.length / 2 - 0.04));
    g.add(box(a.width * 0.92, 0.04, 0.12, trim, 0, 0.12, a.length / 2 - 0.2));
    return g;
  },
  /** Mesh grille bar with vertical slats. */
  mesh: (a, _paint, trim) => {
    const g = new Group();
    g.add(box(a.width * 0.8, 0.06, 0.08, trim, 0, 0.08, a.length / 2 - 0.04));
    for (let i = -2; i <= 2; i++) g.add(box(0.02, 0.05, 0.06, trim, i * a.width * 0.14, 0.08, a.length / 2 - 0.04));
    return g;
  },
};
