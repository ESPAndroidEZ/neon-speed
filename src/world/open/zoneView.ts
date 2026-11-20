import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three';
import { heightAt } from '../roads/height';

/** Drift zones as glowing rings on the ground: every zone in one mesh (one draw call). */
export function zoneMesh(zones: readonly { x: number; z: number; r: number }[], color = 0x18d8ff): Mesh {
  const pos: number[] = [], idx: number[] = [], SEG = 48, W = 1.6;
  for (const z of zones) {
    const y = heightAt(z.x, z.z) + 0.08, b = pos.length / 3;
    for (let k = 0; k <= SEG; k++) {
      const a = (k / SEG) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pos.push(z.x + c * z.r, y, z.z + s * z.r, z.x + c * (z.r - W), y, z.z + s * (z.r - W));
      if (k < SEG) { const i = b + k * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mesh = new Mesh(geo, new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, side: 2 }));
  mesh.name = 'drift-zones';
  mesh.matrixAutoUpdate = false;
  mesh.renderOrder = 2;
  return mesh;
}
