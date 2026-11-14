import type { PartBuilder } from './carParts';
import { Group, Mesh, BoxGeometry } from 'three';

export const SKIRTS_MORE: Record<string, PartBuilder> = {
  sharp: (a, paint, trim) => {
    const g = new Group();
    const len = a.wheelbase * 0.6;
    for (const s of [-1, 1]) {
      const body = new Mesh(new BoxGeometry(0.08, 0.12, len), paint);
      body.position.set(s * (a.width / 2 - 0.04), 0.2, 0);
      const lip = new Mesh(new BoxGeometry(0.1, 0.02, len), trim);
      lip.position.set(s * (a.width / 2 - 0.03), 0.14, 0);
      g.add(body, lip);
    }
    return g;
  },
  ducted: (a, paint, trim) => {
    const g = new Group();
    const len = a.wheelbase * 0.6;
    for (const s of [-1, 1]) {
      const body = new Mesh(new BoxGeometry(0.08, 0.12, len), paint);
      body.position.set(s * (a.width / 2 - 0.04), 0.2, 0);
      const slot = new Mesh(new BoxGeometry(0.02, 0.06, len * 0.5), trim);
      slot.position.set(s * (a.width / 2 - 0.08), 0.2, 0);
      g.add(body, slot);
    }
    return g;
  },
  ribbed: (a, paint, trim) => {
    const g = new Group();
    const len = a.wheelbase * 0.6;
    for (const s of [-1, 1]) {
      const body = new Mesh(new BoxGeometry(0.08, 0.12, len), paint);
      body.position.set(s * (a.width / 2 - 0.04), 0.2, 0);
      for (let i = 0; i < 4; i++) {
        const rib = new Mesh(new BoxGeometry(0.02, 0.1, len / 5), trim);
        rib.position.set(s * (a.width / 2 - 0.09), 0.2, -len * 0.3 + i * len * 0.2);
        g.add(rib);
      }
    }
    return g;
  },
  carbon: (a, paint, trim) => {
    const g = new Group();
    const len = a.wheelbase * 0.6;
    for (const s of [-1, 1]) {
      const sill = new Mesh(new BoxGeometry(0.12, 0.15, len), trim);
      sill.position.set(s * (a.width / 2 - 0.04), 0.18, 0);
      const cap = new Mesh(new BoxGeometry(0.13, 0.02, len), paint);
      cap.position.set(s * (a.width / 2 - 0.04), 0.26, 0);
      g.add(sill, cap);
    }
    return g;
  },
};
