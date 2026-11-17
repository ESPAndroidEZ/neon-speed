import { BufferAttribute, type BufferGeometry, Matrix4, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** One material for every baked person: the part colours live in the vertices. */
const FAR_MAT = new MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
const inv = new Matrix4(), rel = new Matrix4();

/**
 * Far LOD for a jointed person (about 21 meshes, one draw call each): bakes the current pose into ONE mesh with
 * per-vertex colours (one draw call). Built once when the person first freezes, never per frame. The result sits in
 * the rig root's parent space with the rig's transform; call `dispose()` on its geometry when the spot changes.
 */
export function bakePerson(root: Object3D): Mesh | null {
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();
  const parts: BufferGeometry[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || !m.visible || Array.isArray(m.material)) return;
    const c = (m.material as MeshStandardMaterial).color;
    let gm = m.geometry.clone().applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
    if (gm.index) gm = gm.toNonIndexed();
    for (const k of Object.keys(gm.attributes)) if (k !== 'position' && k !== 'normal') gm.deleteAttribute(k);
    const n = gm.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c?.r ?? 1; col[i * 3 + 1] = c?.g ?? 1; col[i * 3 + 2] = c?.b ?? 1; }
    gm.setAttribute('color', new BufferAttribute(col, 3));
    parts.push(gm);
  });
  if (!parts.length) return null;
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (!merged) return null;
  const far = new Mesh(merged, FAR_MAT);
  far.position.copy(root.position);
  far.quaternion.copy(root.quaternion);
  far.scale.copy(root.scale);
  far.matrixAutoUpdate = false; // static: placed once
  far.layers.set(1); // world/layers NO_REFLECT
  far.updateMatrix();
  return far;
}
