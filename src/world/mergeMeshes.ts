import { type BufferGeometry, type Group, type Material, Matrix4, Mesh, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Draw-call saver: merges a group's direct Mesh children that share one material into a single mesh (local
 * transforms baked in). Runs once when a car is built; materials stay shared, so paint, finish, brake lights and
 * rim colour still work. Skips multi-material meshes, meshes with children and `userData.noMerge`.
 * A procedural car went from ~80 draw calls to ~25 (phones are draw-call bound).
 */
export function mergeByMaterial(group: Group): void {
  const buckets = new Map<Material, Mesh[]>();
  for (const c of group.children) {
    const m = c as Mesh;
    if (!m.isMesh || Array.isArray(m.material) || m.children.length || m.userData.noMerge || !m.geometry.attributes.normal) continue;
    const list = buckets.get(m.material) ?? [];
    list.push(m);
    buckets.set(m.material, list);
  }
  for (const [mat, list] of buckets) {
    if (list.length < 2) continue;
    const indexed = list.every((m) => m.geometry.index !== null);
    const names = Object.keys(list[0].geometry.attributes).filter((n) => list.every((m) => n in m.geometry.attributes));
    const geos: BufferGeometry[] = list.map((m) => {
      m.updateMatrix();
      let g = m.geometry.clone().applyMatrix4(m.matrix);
      if (!indexed && g.index) g = g.toNonIndexed();
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
      g.morphAttributes = {};
      return g;
    });
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const out = new Mesh(merged, mat);
    out.castShadow = list.some((m) => m.castShadow);
    out.receiveShadow = list.some((m) => m.receiveShadow);
    for (const m of list) group.remove(m);
    group.add(out);
  }
}

const inv = new Matrix4(), rel = new Matrix4();

/**
 * Whole-tree version for static models (baked GLB cars: their wheels neither spin nor steer): every single-material
 * mesh anywhere under `root` is merged with the others of its material, transforms baked relative to `root`.
 * `byName` also merges different material objects with the same type and name (a GLB's per-part copies).
 * A Blender car went from ~29 draw calls (5 per wheel) to about one per material. Returns the number of meshes removed.
 */
export function mergeTreeByMaterial(root: Object3D, byName = false, keep: Material | null = null): number {
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();
  const buckets = new Map<Material | string, Mesh[]>(), first = new Map<Material | string, Material>();
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || (m as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh || Array.isArray(m.material) || m.userData.noMerge || !m.geometry.attributes.normal || m.morphTargetInfluences) return;
    const key = byName && m.material.name ? `${m.material.type}:${m.material.name}` : m.material; // GLB copies share a name
    const list = buckets.get(key) ?? [];
    list.push(m);
    buckets.set(key, list);
    if (!first.has(key) || m.material === keep) first.set(key, m.material); // `keep` (a material code still edits) wins its bucket
  });
  let removed = 0;
  for (const [key, list] of buckets) {
    const mat = first.get(key) as Material;
    if (list.length < 2) continue;
    const indexed = list.every((m) => m.geometry.index !== null);
    const names = Object.keys(list[0].geometry.attributes).filter((n) => list.every((m) => n in m.geometry.attributes));
    const geos = list.map((m) => {
      let g = m.geometry.clone().applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
      if (!indexed && g.index) g = g.toNonIndexed();
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
      return g;
    });
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const out = new Mesh(merged, mat);
    out.name = list[0].name;
    out.castShadow = list.some((m) => m.castShadow);
    out.receiveShadow = list.some((m) => m.receiveShadow);
    for (const m of list) m.removeFromParent();
    root.add(out);
    removed += list.length - 1;
  }
  return removed;
}
