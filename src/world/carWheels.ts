import { BoxGeometry, CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from 'three';

const tyreMat = new MeshStandardMaterial({ color: 0x070707, roughness: 0.92 });
const rimMat = new MeshStandardMaterial({ color: 0xc4c8d4, metalness: 0.95, roughness: 0.2 });
const dishMat = new MeshStandardMaterial({ color: 0x15171c, metalness: 0.6, roughness: 0.5 });
const brakeMat = new MeshStandardMaterial({ color: 0x4a4d55, metalness: 0.8, roughness: 0.4 });
const caliperMat = new MeshStandardMaterial({ color: 0xc41a1a, roughness: 0.4, metalness: 0.3 });
const archMat = new MeshStandardMaterial({ color: 0x050506, roughness: 0.95 });

/** Rounded tyre (lathe of a sidewall profile) turned so its axle runs along X. */
function tyreGeometry(r: number, width: number): CylinderGeometry {
  const hw = width / 2;
  const pts = [new Vector2(r * 0.64, -hw), new Vector2(r * 0.93, -hw * 0.98), new Vector2(r * 0.995, -hw * 0.7), new Vector2(r, -hw * 0.3), new Vector2(r, hw * 0.3), new Vector2(r * 0.995, hw * 0.7), new Vector2(r * 0.93, hw * 0.98), new Vector2(r * 0.64, hw)];
  return new LatheGeometry(pts, 28).rotateZ(Math.PI / 2) as unknown as CylinderGeometry;
}

/**
 * A spinning wheel: rounded tyre, rim barrel with five spokes and a dark dish, brake disc. `side` is +1 for the left
 * wheels (outer face towards +X) and -1 for the right wheels. The caliper is returned separately: it must not spin.
 */
export function buildWheel(r: number, side: number): { spin: Group; caliper: Mesh } {
  const spin = new Group();
  spin.add(new Mesh(tyreGeometry(r, 0.27), tyreMat));
  spin.add(new Mesh(new CylinderGeometry(r * 0.66, r * 0.66, 0.24, 20).rotateZ(Math.PI / 2), rimMat));
  const face = side * 0.125;
  const dish = new Mesh(new CylinderGeometry(r * 0.5, r * 0.5, 0.03, 16).rotateZ(Math.PI / 2), dishMat);
  dish.position.x = face - side * 0.015;
  spin.add(dish);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = new Mesh(new BoxGeometry(0.035, r * 0.5, r * 0.11), rimMat);
    spoke.position.set(face, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
    spoke.rotation.x = -a;
    spin.add(spoke);
  }
  const hub = new Mesh(new CylinderGeometry(r * 0.12, r * 0.12, 0.05, 10).rotateZ(Math.PI / 2), rimMat);
  hub.position.x = face;
  spin.add(hub);
  const disc = new Mesh(new CylinderGeometry(r * 0.52, r * 0.52, 0.025, 20).rotateZ(Math.PI / 2), brakeMat);
  disc.position.x = -side * 0.05;
  spin.add(disc);
  const caliper = new Mesh(new BoxGeometry(0.07, r * 0.32, r * 0.22), caliperMat);
  caliper.position.set(-side * 0.05, r * 0.3, -r * 0.18);
  return { spin, caliper };
}

/** Dark wheel-arch disc, slightly larger than the tyre and wider than the body skin, so the arch reads as a cut-out. */
export function buildArch(r: number): Mesh {
  return new Mesh(new CylinderGeometry(r * 1.14, r * 1.14, 0.42, 24).rotateZ(Math.PI / 2), archMat);
}
