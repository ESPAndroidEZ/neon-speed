import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SpeedTrap } from '../../core/speedTraps';
import { heightAt } from '../roads/height';

/** Speed cameras as one static mesh (one draw call): a dark post at the kerb with a glowing red head. */
export function trapMesh(traps: readonly SpeedTrap[]): Mesh {
  const parts: BufferGeometry[] = [];
  const paint = (g: BufferGeometry, r: number, gg: number, b: number): BufferGeometry => {
    const n = g.getAttribute('position').count;
    g.setAttribute('color', new Float32BufferAttribute(new Array(n).fill(0).flatMap(() => [r, gg, b]), 3));
    return g;
  };
  for (const t of traps) {
    const x = t.x + t.tz * (t.half - 1.5), z = t.z - t.tx * (t.half - 1.5), y = heightAt(x, z), yaw = Math.atan2(t.tx, t.tz);
    parts.push(paint(new BoxGeometry(0.25, 4.2, 0.25).translate(0, 2.1, 0).rotateY(yaw).translate(x, y, z), 0.08, 0.08, 0.1));
    parts.push(paint(new BoxGeometry(0.7, 0.45, 0.45).translate(0, 4.4, 0).rotateY(yaw).translate(x, y, z), 1.8, 0.15, 0.12));
  }
  const geo = mergeGeometries(parts) as BufferGeometry;
  for (const p of parts) p.dispose();
  const mesh = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true }));
  mesh.name = 'speed-traps';
  mesh.matrixAutoUpdate = false;
  return mesh;
}
