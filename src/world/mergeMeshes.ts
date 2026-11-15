import { type BufferGeometry, type Group, type Material, Mesh } from 'three';
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
