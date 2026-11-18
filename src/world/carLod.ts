import type { Object3D } from 'three';
import { qualityTier } from '../core/quality';

/** Where the camera was last frame (set by main's frame hook); the car LOD measures from here. */
export const LOD_EYE = { x: 0, z: 0 };
/** Distance (m) beyond which a car hides its detail meshes (brake discs, wheel dishes, calipers: inside the rims). */
const RANGE = { low: 12, medium: 22, high: 32, ultra: 45 } as const;
const cache = new WeakMap<Object3D, Object3D[]>();

/** Mark a mesh as car detail: hidden on cars far from the camera. */
export const markDetail = (o: Object3D): void => void (o.userData.lod = 1);

/** Hide or show the detail meshes of one car visual root. No allocation after the first call per visual. */
export function applyCarLod(root: Object3D, x: number, z: number): void {
  let parts = cache.get(root);
  if (!parts) {
    parts = [];
    const list = parts;
    root.traverse((o) => { if (o.userData.lod === 1) list.push(o); });
    cache.set(root, parts);
  }
  const r = RANGE[qualityTier()], dx = x - LOD_EYE.x, dz = z - LOD_EYE.z, near = dx * dx + dz * dz < r * r;
  for (let i = 0; i < parts.length; i++) parts[i].visible = near;
}
