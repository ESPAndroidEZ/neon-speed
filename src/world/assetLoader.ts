import { Box3, Group, Material, Mesh, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CarModel } from '../types/game';

export interface LoadOptions {
  /** Longest horizontal extent after normalising, metres. Default 4.4. */
  targetLength?: number;
  /** Extra yaw about Y (radians) to fix a model that faces the wrong way. */
  yawOffset?: number;
  /** Extra uniform scale on top of targetLength. */
  scale?: number;
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Group>>();
const failed = new Set<string>();
const WHEEL = /wheel|tire|tyre|rim/i;
const NOT_BODY = /glass|window|tire|tyre|wheel|rim|light|lamp|chrome|interior|seat|black/i;
const BODY = /body|paint|car_?paint|shell|exterior/i;

/** True if loading this URL already failed (missing file), so callers can skip retrying. */
export const hasFailed = (url: string): boolean => failed.has(url);

function fetchScene(url: string): Promise<Group> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((g) => g.scene);
    p.catch(() => failed.add(url));
    cache.set(url, p);
  }
  return p;
}

/**
 * Load a car GLB and normalise it (Tripo meshes arrive with arbitrary scale, origin and facing):
 * long axis along Z, yawOffset, scaled to targetLength, centred on X/Z, lowest point at y = 0.
 * Each call returns an independent clone. Rejects with an Error naming the URL on failure.
 */
export async function loadCarModel(url: string, opts: LoadOptions = {}): Promise<CarModel> {
  let scene: Group;
  try {
    scene = await fetchScene(url);
  } catch (e) {
    throw new Error(`Failed to load car model ${url}: ${e instanceof Error ? e.message : String(e)}`);
  }
  return normaliseCarScene(scene, opts);
}

/** The normalisation step on its own (pure three, testable without a network). Clones `scene`. */
export function normaliseCarScene(scene: Object3D, opts: LoadOptions = {}): CarModel {
  const inner = scene.clone(true);
  const root = new Group();
  const pivot = new Group(); // yaw lives here so it can be nudged live
  pivot.add(inner);
  root.add(pivot);

  const box = new Box3();
  const size = new Vector3();
  box.setFromObject(inner);
  box.getSize(size);
  if (size.x > size.z) inner.rotation.y = Math.PI / 2;
  pivot.rotation.y = opts.yawOffset ?? 0;
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  box.getSize(size);
  const k = (((opts.targetLength ?? 4.4) * (opts.scale ?? 1)) / Math.max(size.x, size.z, 1e-6));
  root.scale.setScalar(k);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const c = box.getCenter(new Vector3());
  // wrap so the scale lives on an inner group and the returned root sits at the origin
  const out = new Group();
  root.position.set(-c.x, -box.min.y, -c.z);
  out.add(root);
  out.userData.pivot = pivot;
  out.userData.baseYaw = opts.yawOffset ?? 0;
  box.setFromObject(out);
  box.getSize(size);

  const wheels: Object3D[] = [];
  inner.traverse((o) => {
    if (o.parent === inner && WHEEL.test(o.name)) wheels.push(o);
    if (o instanceof Mesh) {
      o.castShadow = true;
      o.material = Array.isArray(o.material) ? o.material.map((m: Material) => m.clone()) : o.material.clone(); // own materials: safe to tint
    }
  });
  return { root: out, wheels, size: { x: size.x, y: size.y, z: size.z } };
}

/** Rotate the model's yaw live (garage calibration). Absolute radians, replaces yawOffset. */
export function setModelYaw(model: CarModel, yaw: number): void {
  const pivot = model.root.userData.pivot as Group | undefined;
  if (pivot) pivot.rotation.y = yaw;
}

/**
 * Pick the paintable body material, or null when it cannot be told apart (single baked texture):
 * a material whose name says body/paint, else the material of the biggest mesh when the model has 2+ materials.
 */
export function findBodyMaterial(root: Object3D): Material | null {
  const mats = new Set<Material>();
  let named: Material | null = null;
  let best: Material | null = null;
  let bestVol = 0;
  const b = new Box3();
  const s = new Vector3();
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      mats.add(m);
      if (!named && BODY.test(m.name)) named = m;
      if (NOT_BODY.test(m.name)) continue;
      b.setFromObject(o);
      b.getSize(s);
      const vol = s.x * s.y * s.z;
      if (vol > bestVol) {
        bestVol = vol;
        best = m;
      }
    }
  });
  if (named) return named;
  return mats.size >= 2 ? best : null;
}

/**
 * Dispose what this clone owns: its cloned materials. Geometry and textures stay, because they are shared
 * with the cached source and with other clones (use `clearModelCache` to drop those).
 */
export function disposeCarModel(model: CarModel): void {
  model.root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) m.dispose();
  });
}

/** Forget every cached glTF (frees GPU memory when leaving the game). */
export function clearModelCache(): void {
  cache.clear();
  failed.clear();
}
