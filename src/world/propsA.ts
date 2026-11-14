import type { PropBuilder } from './propsKit';
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, type Material } from 'three';

const mat = (c: number, r = 0.6, m = 0.3): Material => new MeshStandardMaterial({ color: c, roughness: r, metalness: m });

export const PROPS_A: Record<string, PropBuilder> = {
  bench: () => {
    const g = new Group();
    const seat = new Mesh(new BoxGeometry(1.6, 0.06, 0.45), mat(0x6b4226, 0.8));
    seat.position.y = 0.45;
    const back = new Mesh(new BoxGeometry(1.6, 0.5, 0.05), mat(0x6b4226, 0.8));
    back.position.set(0, 0.72, -0.2);
    const legL = new Mesh(new BoxGeometry(0.06, 0.45, 0.4), mat(0x333333, 0.4, 0.7));
    legL.position.set(-0.7, 0.225, 0);
    const legR = legL.clone();
    legR.position.x = 0.7;
    g.add(seat, back, legL, legR);
    return g;
  },
  bollard: () => {
    const g = new Group();
    const body = new Mesh(new CylinderGeometry(0.08, 0.08, 0.8, 6), mat(0x222222, 0.3, 0.5));
    body.position.y = 0.4;
    const band = new Mesh(new CylinderGeometry(0.085, 0.085, 0.06, 6), new MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 1.5 }));
    band.position.y = 0.6;
    const cap = new Mesh(new CylinderGeometry(0.09, 0.09, 0.04, 6), mat(0x444444, 0.3, 0.5));
    cap.position.y = 0.82;
    g.add(body, band, cap);
    return g;
  },
  hydrant: () => {
    const g = new Group();
    const body = new Mesh(new CylinderGeometry(0.15, 0.18, 0.5, 6), new MeshStandardMaterial({ color: 0xcc2222, emissive: 0xcc2222, emissiveIntensity: 1.5, roughness: 0.4, metalness: 0.3 }));
    body.position.y = 0.25;
    const dome = new Mesh(new CylinderGeometry(0.12, 0.15, 0.12, 6), mat(0xcc2222, 0.4, 0.3));
    dome.position.y = 0.56;
    const nozzle = new Mesh(new CylinderGeometry(0.05, 0.05, 0.1, 6), mat(0x999999, 0.3, 0.7));
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(0.18, 0.3, 0);
    g.add(body, dome, nozzle);
    return g;
  },
  mailbox: () => {
    const g = new Group();
    const post = new Mesh(new CylinderGeometry(0.04, 0.04, 1.0, 6), mat(0x555555, 0.5, 0.5));
    post.position.y = 0.5;
    const box = new Mesh(new BoxGeometry(0.35, 0.3, 0.25), mat(0x2255aa, 0.5, 0.3));
    box.position.y = 1.15;
    const flag = new Mesh(new BoxGeometry(0.02, 0.12, 0.02), new MeshStandardMaterial({ color: 0xff3333, emissive: 0xff3333, emissiveIntensity: 1.5 }));
    flag.position.set(0.18, 1.3, 0);
    g.add(post, box, flag);
    return g;
  },
  payphone: () => {
    const g = new Group();
    const body = new Mesh(new BoxGeometry(0.5, 1.8, 0.4), mat(0x334455, 0.5, 0.4));
    body.position.y = 0.9;
    const screen = new Mesh(new BoxGeometry(0.3, 0.2, 0.02), new MeshStandardMaterial({ color: 0x44ffcc, emissive: 0x44ffcc, emissiveIntensity: 1.5 }));
    screen.position.set(0, 1.4, 0.21);
    const base = new Mesh(new BoxGeometry(0.55, 0.1, 0.45), mat(0x222222, 0.6, 0.3));
    base.position.y = 0.05;
    g.add(body, screen, base);
    return g;
  },
};
