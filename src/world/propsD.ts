import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PropBuilder } from './propsKit';

export const PROPS_D: Record<string, PropBuilder> = {
  'vending-machine': () => {
    const g = new Group();
    const body = new Mesh(new BoxGeometry(0.6, 1.8, 0.5), new MeshStandardMaterial({ color: 0x2a2a3a }));
    body.position.y = 0.9;
    const screen = new Mesh(new BoxGeometry(0.5, 0.3, 0.05), new MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.5 }));
    screen.position.set(0, 1.5, 0.26);
    g.add(body, screen);
    return g;
  },
  'food-cart': () => {
    const g = new Group();
    const base = new Mesh(new BoxGeometry(1.2, 0.7, 0.6), new MeshStandardMaterial({ color: 0x8b4513 }));
    base.position.y = 0.55;
    const canopy = new Mesh(new BoxGeometry(1.4, 0.05, 0.8), new MeshStandardMaterial({ color: 0xcc2222 }));
    canopy.position.y = 1.4;
    const wheelGeo = new CylinderGeometry(0.15, 0.15, 0.1, 6);
    const wheelMat = new MeshStandardMaterial({ color: 0x333333 });
    const wl = new Mesh(wheelGeo, wheelMat); wl.position.set(-0.4, 0.15, 0);
    const wr = new Mesh(wheelGeo, wheelMat); wr.position.set(0.4, 0.15, 0);
    g.add(base, canopy, wl, wr);
    return g;
  },
  'umbrella-table': () => {
    const g = new Group();
    const top = new Mesh(new BoxGeometry(0.8, 0.05, 0.8), new MeshStandardMaterial({ color: 0x8b6914 }));
    top.position.y = 0.75;
    const leg = new Mesh(new BoxGeometry(0.06, 0.7, 0.06), new MeshStandardMaterial({ color: 0x555555 }));
    leg.position.y = 0.35;
    const pole = new Mesh(new BoxGeometry(0.04, 1.2, 0.04), new MeshStandardMaterial({ color: 0x555555 }));
    pole.position.y = 1.35;
    const umbrella = new Mesh(new CylinderGeometry(0.05, 0.6, 0.3, 8), new MeshStandardMaterial({ color: 0x2266aa }));
    umbrella.position.y = 2.0;
    g.add(top, leg, pole, umbrella);
    return g;
  },
  'crate-stack': () => {
    const g = new Group();
    const mat1 = new MeshStandardMaterial({ color: 0x8b7355 });
    const mat2 = new MeshStandardMaterial({ color: 0x6b5335 });
    const c1 = new Mesh(new BoxGeometry(0.5, 0.4, 0.5), mat1); c1.position.y = 0.2;
    const c2 = new Mesh(new BoxGeometry(0.45, 0.35, 0.45), mat2); c2.position.y = 0.575;
    const c3 = new Mesh(new BoxGeometry(0.4, 0.3, 0.4), mat1); c3.position.y = 0.925;
    g.add(c1, c2, c3);
    return g;
  },
  'neon-stand': () => {
    const g = new Group();
    const body = new Mesh(new BoxGeometry(0.4, 1.2, 0.4), new MeshStandardMaterial({ color: 0x1a1a2e }));
    body.position.y = 0.6;
    const sign = new Mesh(new BoxGeometry(0.5, 0.3, 0.05), new MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.5 }));
    sign.position.set(0, 1.35, 0.21);
    g.add(body, sign);
    return g;
  },
};
