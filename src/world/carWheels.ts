import { mergeByMaterial } from './mergeMeshes';
import { markDetail } from './carLod';
import { noReflect } from './layers';
import { centreCap, RIM_DESIGNS } from './rims';
import { BoxGeometry, CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from 'three';

const tyreMat = new MeshStandardMaterial({ color: 0x070707, roughness: 0.92 });
const dishMat = new MeshStandardMaterial({ color: 0x15171c, metalness: 0.6, roughness: 0.5 });
const brakeMat = new MeshStandardMaterial({ color: 0x4a4d55, metalness: 0.8, roughness: 0.4 });
const archMat = new MeshStandardMaterial({ color: 0x050506, roughness: 0.95 });

/** Materials one car owns (so a rim or caliper colour change never touches other cars). */
export interface WheelMats {
  rim: MeshStandardMaterial;
  caliper: MeshStandardMaterial;
}
export const makeWheelMats = (): WheelMats => ({
  rim: new MeshStandardMaterial({ color: 0xc4c8d4, metalness: 0.95, roughness: 0.2 }),
  caliper: new MeshStandardMaterial({ color: 0xc41a1a, roughness: 0.4, metalness: 0.3 }),
});

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
export function buildWheel(r: number, side: number, mats: WheelMats, design = 'five', size = 18): { spin: Group; caliper: Mesh } {
  const rimMat = mats.rim;
  const spin = new Group();
  spin.add(new Mesh(tyreGeometry(r, 0.27), tyreMat));
  spin.add(new Mesh(new CylinderGeometry(r * Math.min(0.8, 0.66 * (size / 18)), r * Math.min(0.8, 0.66 * (size / 18)), 0.24, 20).rotateZ(Math.PI / 2), rimMat));
  const face = side * 0.125;
  const dish = new Mesh(new CylinderGeometry(r * 0.62, r * 0.62, 0.03, 20).rotateZ(Math.PI / 2), dishMat);
  dish.position.x = face - side * 0.015;
  markDetail(dish);
  spin.add(dish);
  for (const p of (RIM_DESIGNS[design] ?? RIM_DESIGNS.five)(r, face, rimMat)) spin.add(p);
  spin.add(centreCap(r, face, rimMat));
  const disc = new Mesh(new CylinderGeometry(r * 0.52, r * 0.52, 0.025, 20).rotateZ(Math.PI / 2), brakeMat);
  disc.position.x = -side * 0.05;
  markDetail(disc);
  spin.add(disc);
  mergeByMaterial(spin); // ~10 meshes -> 4 (tyre, rim, dish, disc)
  const caliper = new Mesh(new BoxGeometry(0.07, r * 0.32, r * 0.22), mats.caliper);
  caliper.position.set(-side * 0.05, r * 0.3, -r * 0.18);
  markDetail(caliper);
  noReflect(spin);
  noReflect(caliper);
  return { spin, caliper };
}

/** Dark wheel-arch disc, slightly larger than the tyre and wider than the body skin, so the arch reads as a cut-out. */
export function buildArch(r: number): Mesh {
  return new Mesh(new CylinderGeometry(r * 1.14, r * 1.14, 0.42, 24).rotateZ(Math.PI / 2), archMat);
}
