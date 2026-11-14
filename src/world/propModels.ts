import { Box3, Group, InstancedMesh, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface Placement {
  x: number;
  y?: number;
  z: number;
  yaw: number;
}

export type PropName = 'lamp' | 'sign' | 'kiosk' | 'container';

/** Target size per prop: `height` for upright props, `length` for containers (their long axis is Z). */
const TARGET: Record<PropName, { height?: number; length?: number }> = {
  lamp: { height: 6.5 }, sign: { height: 2 }, kiosk: { height: 2.8 }, container: { length: 6.1 },
};

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Group | null>>();

const propUrl = (name: PropName): string => `${import.meta.env?.BASE_URL ?? '/'}models/props/${name}.glb`;

/** Optional prop GLB (public/models/props/<name>.glb), normalised: scaled to its target size, centred, ground at y = 0. Null if absent. */
export function loadPropModel(name: PropName): Promise<Group | null> {
  let p = cache.get(name);
  if (!p) {
    p = loader.loadAsync(propUrl(name)).then((g) => normaliseProp(g.scene, name)).catch(() => null);
    cache.set(name, p);
  }
  return p;
}

/** Normalise a prop scene. Exported for tests. */
export function normaliseProp(scene: Object3D, name: PropName): Group {
  const inner = scene.clone(true);
  const out = new Group();
  out.add(inner);
  const box = new Box3().setFromObject(out);
  const size = box.getSize(new Vector3());
  if (name === 'container' && size.x > size.z) inner.rotation.y = Math.PI / 2; // long axis along Z
  out.updateMatrixWorld(true);
  box.setFromObject(out);
  box.getSize(size);
  const t = TARGET[name];
  const k = t.length ? t.length / Math.max(size.z, 1e-6) : (t.height ?? 1) / Math.max(size.y, 1e-6);
  out.scale.setScalar(k);
  out.updateMatrixWorld(true);
  box.setFromObject(out);
  const c = box.getCenter(new Vector3());
  const wrap = new Group();
  out.position.set(-c.x, -box.min.y, -c.z);
  wrap.add(out);
  return wrap;
}

/** One InstancedMesh per mesh in the prop, sharing geometry and materials, placed at every placement. */
export function instanceProp(prop: Group, placements: readonly Placement[]): Group {
  const g = new Group();
  prop.updateMatrixWorld(true);
  const m = new Matrix4();
  const place = new Object3D();
  prop.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const im = new InstancedMesh(o.geometry, o.material, Math.max(1, placements.length));
    placements.forEach((p, i) => {
      place.position.set(p.x, p.y ?? 0, p.z);
      place.rotation.set(0, p.yaw, 0);
      place.updateMatrix();
      im.setMatrixAt(i, m.multiplyMatrices(place.matrix, o.matrixWorld));
    });
    im.count = placements.length;
    im.castShadow = false;
    g.add(im);
  });
  return g;
}
