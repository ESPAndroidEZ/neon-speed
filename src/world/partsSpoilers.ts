import { BoxGeometry, Group, Mesh, type Material } from 'three';
import type { PartBuilder } from './carParts';

const box = (w: number, h: number, d: number, m: Material, x: number, y: number, z: number): Mesh => {
  const b = new Mesh(new BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
};

export const SPOILER_MORE: Record<string, PartBuilder> = {
  /** Low ducktail kick at the trunk edge. */
  ducktail: (a, paint, _trim) => {
    const g = new Group();
    const z = -a.length / 2 + 0.05;
    g.add(box(a.width * 0.86, 0.03, 0.1, paint, 0, a.belt, z));
    return g;
  },
  /** Slim flat lip, slightly raised. */
  'lip-slim': (a, paint, _trim) => {
    const g = new Group();
    const z = -a.length / 2 + 0.07;
    g.add(box(a.width * 0.9, 0.04, 0.14, paint, 0, a.belt + 0.02, z));
    return g;
  },
  /** Two stacked blades on small uprights. */
  'twin-blade': (a, _paint, trim) => {
    const g = new Group();
    const z = -a.length / 2 + 0.12;
    const y = a.belt + 0.06;
    g.add(box(a.width * 0.88, 0.03, 0.2, trim, 0, y, z), box(a.width * 0.88, 0.03, 0.2, trim, 0, y + 0.08, z));
    g.add(box(0.04, 0.06, 0.1, trim, a.width * 0.3, y - 0.03, z), box(0.04, 0.06, 0.1, trim, -a.width * 0.3, y - 0.03, z));
    return g;
  },
  /** Wing on swan-neck uprights at the rear. */
  'swan-neck': (a, paint, trim) => {
    const g = new Group();
    const z = -a.length / 2 + 0.18;
    const y = a.belt + 0.28;
    g.add(box(a.width * 0.92, 0.04, 0.28, paint, 0, y, z));
    g.add(box(0.05, 0.26, 0.14, trim, a.width * 0.32, y - 0.15, z + 0.06), box(0.05, 0.26, 0.14, trim, -a.width * 0.32, y - 0.15, z + 0.06));
    return g;
  },
  /** Roof fin above the rear window. */
  'roof-fin': (a, paint, _trim) => {
    const g = new Group();
    const z = -a.length / 2 + 0.35;
    g.add(box(0.06, 0.18, 0.5, paint, 0, a.belt + 0.5, z));
    g.add(box(a.width * 0.3, 0.02, 0.5, paint, 0, a.belt + 0.41, z));
    return g;
  },
  /** Very large wing on wide uprights. */
  'big-wing': (a, paint, trim) => {
    const g = new Group();
    const z = -a.length / 2 + 0.22;
    const y = a.belt + 0.42;
    g.add(box(a.width * 1.0, 0.06, 0.4, paint, 0, y, z));
    g.add(box(0.08, 0.38, 0.2, trim, a.width * 0.38, y - 0.22, z), box(0.08, 0.38, 0.2, trim, -a.width * 0.38, y - 0.22, z));
    return g;
  },
};
