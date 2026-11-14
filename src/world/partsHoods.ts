import type { PartBuilder } from './carParts';
import * as THREE from 'three';

export const HOOD_MORE: Record<string, PartBuilder> = {
  scoop(a, paint, trim) {
    const g = new THREE.Group();
    const w = a.width * 0.35, d = a.length * 0.12, h = 0.12;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint);
    body.position.set(0, a.belt - 0.02 + h / 2, a.length * 0.24);
    g.add(body);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d * 0.3), trim);
    lip.position.set(0, a.belt - 0.02 + h + 0.015, a.length * 0.24 + d * 0.35);
    g.add(lip);
    return g;
  },
  'twin-vent'(a, paint, trim) {
    const g = new THREE.Group();
    const w = a.width * 0.18, d = a.length * 0.08, h = 0.04;
    const base = new THREE.Mesh(new THREE.BoxGeometry(a.width * 0.45, 0.02, d * 1.4), paint);
    base.position.set(0, a.belt - 0.02 + 0.01, a.length * 0.24);
    g.add(base);
    for (const s of [-1, 1]) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trim);
      v.position.set(s * a.width * 0.18, a.belt - 0.02 + 0.02 + h / 2, a.length * 0.24);
      g.add(v);
    }
    return g;
  },
  louvered(a, paint, trim) {
    const g = new THREE.Group();
    const w = a.width * 0.5, d = a.length * 0.02, h = 0.03;
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, 0.02, a.length * 0.16), paint);
    base.position.set(0, a.belt - 0.02 + 0.01, a.length * 0.24);
    g.add(base);
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trim);
      s.position.set(0, a.belt - 0.02 + 0.02 + h / 2, a.length * 0.24 - a.length * 0.06 + i * a.length * 0.03);
      s.rotation.x = -0.3;
      g.add(s);
    }
    return g;
  },
  'carbon-flat'(a, paint, trim) {
    const g = new THREE.Group();
    const w = a.width * 0.6, d = a.length * 0.15, h = 0.02;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.015, d + 0.04), paint);
    frame.position.set(0, a.belt - 0.02 + 0.0075, a.length * 0.24);
    g.add(frame);
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trim);
    p.position.set(0, a.belt - 0.02 + 0.015 + h / 2, a.length * 0.24);
    g.add(p);
    return g;
  },
};
