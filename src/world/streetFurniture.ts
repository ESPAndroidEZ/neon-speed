import { AdditiveBlending, BoxGeometry, Color, CylinderGeometry, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry } from 'three';
import { createRng } from '../core/rng';
import { buildingExtent, type Building } from './city';
import type { Track } from './track';
import { makePoolTexture } from './textures';

const LAMP_EVERY = 10; // samples
const LAMP_H = 9;
const NEON = [0xff2a9d, 0x18d8ff, 0xffb347, 0x7a5cff, 0x39ff88];

export interface Furniture {
  group: Group;
  /** Additive light-pool decals under the lamps; weather raises their opacity when wet. */
  poolMat: MeshBasicMaterial;
}

/** Street lamps with light-pool streaks on the road, and neon signs on buildings facing the circuit. */
export function buildFurniture(tr: Track, buildings: readonly Building[], seed = 5): Furniture {
  const rnd = createRng(seed);
  const group = new Group();
  const dummy = new Object3D();
  const n = tr.samples.length;
  const lamps = Math.floor(n / LAMP_EVERY);

  const poles = new InstancedMesh(new CylinderGeometry(0.1, 0.16, LAMP_H, 6).translate(0, LAMP_H / 2, 0), new MeshStandardMaterial({ color: 0x20242c, roughness: 0.6, metalness: 0.7 }), lamps);
  const headMat = new MeshBasicMaterial({ color: new Color(0xffd9a0).multiplyScalar(3) });
  const heads = new InstancedMesh(new BoxGeometry(1.6, 0.18, 0.5), headMat, lamps);
  const poolMat = new MeshBasicMaterial({ map: makePoolTexture(), color: new Color(0xffc880).multiplyScalar(1.4), transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending });
  const pools = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, lamps);
  for (let i = 0; i < lamps; i++) {
    const s = tr.samples[i * LAMP_EVERY];
    const side = i % 2 === 0 ? 1 : -1;
    const lx = s.position.x + s.tangent.z * side * (tr.barrierOffset + 1.6);
    const lz = s.position.z - s.tangent.x * side * (tr.barrierOffset + 1.6);
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    dummy.position.set(lx, 0, lz);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(lx - s.tangent.z * side * 1.0, LAMP_H, lz + s.tangent.x * side * 1.0);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    dummy.position.set(s.position.x + s.tangent.z * side * 2, 0.05, s.position.z - s.tangent.x * side * 2);
    dummy.scale.set(15, 1, 26);
    dummy.updateMatrix();
    pools.setMatrixAt(i, dummy.matrix);
  }
  group.add(poles, heads, pools);

  // Neon signs: on the face of each near building that looks at the track.
  const near = buildings.filter((b) => {
    let best = Infinity;
    for (let i = 0; i < n; i += 3) best = Math.min(best, Math.hypot(tr.samples[i].position.x - b.x, tr.samples[i].position.z - b.z));
    return best < 48;
  });
  const signMat = new MeshBasicMaterial({ color: 0xffffff });
  const signs = new InstancedMesh(new BoxGeometry(1, 1, 0.3), signMat, near.length);
  const c = new Color();
  near.forEach((b, i) => {
    let bd = Infinity;
    let sx = 0;
    let sz = 0;
    for (let k = 0; k < n; k += 3) {
      const d = Math.hypot(tr.samples[k].position.x - b.x, tr.samples[k].position.z - b.z);
      if (d < bd) {
        bd = d;
        sx = tr.samples[k].position.x - b.x;
        sz = tr.samples[k].position.z - b.z;
      }
    }
    const [hx, hz] = buildingExtent(b);
    const alongX = Math.abs(sx) > Math.abs(sz);
    dummy.position.set(b.x + (alongX ? Math.sign(sx) * (hx + 0.2) : (rnd() - 0.5) * hx), 6 + rnd() * 10, b.z + (alongX ? (rnd() - 0.5) * hz : Math.sign(sz) * (hz + 0.2)));
    dummy.rotation.set(0, alongX ? Math.PI / 2 : 0, 0);
    dummy.scale.set(4 + rnd() * 5, 1.2 + rnd() * 1.6, 1);
    dummy.updateMatrix();
    signs.setMatrixAt(i, dummy.matrix);
    signs.setColorAt(i, c.setHex(NEON[Math.floor(rnd() * NEON.length)]).multiplyScalar(2.6));
  });
  group.add(signs);
  return { group, poolMat };
}
