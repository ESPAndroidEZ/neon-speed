import { PointLight, BoxGeometry, CircleGeometry, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, TorusGeometry, type Texture } from 'three';

/** Where the showroom car sits: far from the street grid, so the menu camera never ends up inside a building. */
export const STAGE = { x: 900, z: 900 };

/** Garage stage: glossy dark floor, two neon rings and a ring of vertical light bars for the orbit camera to sweep past. */
export function buildStage(env: Texture): Group {
  const g = new Group();
  g.position.set(STAGE.x, 0, STAGE.z);
  const floor = new Mesh(new CircleGeometry(11, 48).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x0a0c14, roughness: 0.55, metalness: 0.25, envMap: env, envMapIntensity: 0.3 }));
  floor.position.y = 0.01;
  const ring = (r: number, hex: number, k: number): Mesh => {
    const m = new Mesh(new TorusGeometry(r, 0.06, 6, 64).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(k) }));
    m.position.y = 0.05;
    return m;
  };
  // key and rim lights so the car reads as a product shot (they are far from the street, so they never touch it)
  // point lights with a hard distance cut-off: directional lights would light the whole street, far away
  const key = new PointLight(0xfff0e0, 260, 26, 1.8);
  key.position.set(6, 8, 7);
  const rim = new PointLight(0x4aa8ff, 150, 24, 1.8);
  rim.position.set(-8, 5, -7);
  g.add(key, rim);
  g.add(floor, ring(7.2, 0x18d8ff, 1.3), ring(10.5, 0xff2a9d, 1.3));
  const cols = [0xff2a9d, 0x18d8ff, 0x7a5cff, 0xffb347];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bar = new Mesh(new BoxGeometry(0.4, 9, 0.4), new MeshBasicMaterial({ color: new Color(cols[i % cols.length]).multiplyScalar(1.1) }));
    bar.position.set(Math.sin(a) * 22, 4.5, Math.cos(a) * 22);
    g.add(bar);
  }
  return g;
}
