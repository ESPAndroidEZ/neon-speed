import { BoxGeometry, Color, Group, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { createRng } from '../core/rng';
import type { Track } from './track';

const COLORS = [0xb3262b, 0x2459a8, 0xd8a31a, 0x2f8f5b, 0x8a8f99, 0xe0662b, 0x6a3d7a];

/**
 * Container walls: stacks one to four high flush against both walls of every yard lane, so the lane reads as a
 * maze. Instanced; the stacks sit outside the collision walls.
 */
export function buildYard(tr: Track, seed = 9): Group {
  const g = new Group();
  const rnd = createRng(seed);
  const n = tr.samples.length;
  const boxes = new InstancedMesh(new BoxGeometry(2.4, 2.6, 6.1), new MeshStandardMaterial({ roughness: 0.55, metalness: 0.4 }), 1600);
  const d = new Object3D();
  const c = new Color();
  let count = 0;
  for (let i = 0; i < n && count < 1590; i += 2) {
    if (tr.zones[i] !== 'yard') continue;
    const s = tr.samples[i];
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    for (const side of [1, -1]) {
      if (rnd() < 0.08) continue; // a gap now and then, a glimpse of the next lane
      const levels = 1 + Math.floor(rnd() * 4);
      const off = side * (tr.wall[i] + 1.3);
      for (let l = 0; l < levels && count < 1600; l++, count++) {
        d.position.set(s.position.x + s.tangent.z * off, 1.3 + l * 2.6, s.position.z - s.tangent.x * off);
        d.rotation.y = yaw;
        d.updateMatrix();
        boxes.setMatrixAt(count, d.matrix);
        boxes.setColorAt(count, c.setHex(COLORS[Math.floor(rnd() * COLORS.length)]).multiplyScalar(0.8));
      }
    }
  }
  boxes.count = count;
  g.add(boxes);
  return g;
}
