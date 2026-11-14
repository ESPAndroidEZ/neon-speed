import { BoxGeometry, Color, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three';
import { ribbon, wallStrip } from './ribbon';
import type { Track } from './track';

const hdr = (hex: number, k: number): Color => new Color(hex).multiplyScalar(k);

/** Indices of the first and last sample of a zone's main run (null if absent). */
export function zoneRun(tr: Track, zone: string): [number, number] | null {
  const a = tr.zones.indexOf(zone as never);
  if (a < 0) return null;
  let b = a;
  while (b + 1 < tr.zones.length && tr.zones[b + 1] === zone) b++;
  return [a, b];
}

/** Tunnel: concrete walls and ceiling, orange ceiling lamps, cyan wall strips and portal headers. */
export function buildTunnel(tr: Track): Group {
  const g = new Group();
  const run = zoneRun(tr, 'tunnel');
  if (!run) return g;
  const keep = (i: number): boolean => i >= run[0] && i <= run[1];
  const concrete = new MeshStandardMaterial({ color: 0x3b3e47, roughness: 0.9, side: DoubleSide });
  g.add(new Mesh(wallStrip(tr, (i) => tr.wall[i], 0, 5.4, 6, keep), concrete), new Mesh(wallStrip(tr, (i) => -tr.wall[i], 0, 5.4, 6, keep), concrete));
  g.add(new Mesh(ribbon(tr, (i) => -tr.wall[i], (i) => tr.wall[i], 5.4, 8, keep), new MeshStandardMaterial({ color: 0x23252b, roughness: 0.95, side: DoubleSide })));
  const cyan = new MeshBasicMaterial({ color: hdr(0x18d8ff, 2.2), side: DoubleSide });
  g.add(new Mesh(wallStrip(tr, (i) => tr.wall[i] - 0.03, 1.0, 1.14, 6, keep), cyan), new Mesh(wallStrip(tr, (i) => -tr.wall[i] + 0.03, 1.0, 1.14, 6, keep), cyan));

  const lamps = Math.floor((run[1] - run[0]) / 2);
  const lampMesh = new InstancedMesh(new BoxGeometry(0.45, 0.1, 2.4), new MeshBasicMaterial({ color: hdr(0xffa040, 3) }), lamps * 2);
  const d = new Object3D();
  for (let k = 0; k < lamps; k++) {
    const i = run[0] + 1 + k * 2;
    const s = tr.samples[i];
    for (const side of [-1, 1]) {
      const off = side * s.width * 0.22;
      d.position.set(s.position.x + s.tangent.z * off, 5.3, s.position.z - s.tangent.x * off);
      d.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
      d.updateMatrix();
      lampMesh.setMatrixAt(k * 2 + (side > 0 ? 1 : 0), d.matrix);
    }
  }
  g.add(lampMesh);
  // portal headers: a slab across the road above the tunnel mouth, at both ends
  const slabMat = new MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.85 });
  for (const i of [run[0], run[1]]) {
    const s = tr.samples[i];
    const slab = new Mesh(new BoxGeometry(tr.wall[i] * 2 + 3, 7, 1.6), slabMat);
    slab.position.set(s.position.x, 8.9, s.position.z);
    slab.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
    g.add(slab);
  }
  return g;
}

/** Bridge: parapets with neon rails, steel gantry arches, and canal water on both sides under the deck. */
export function buildBridge(tr: Track): Group {
  const g = new Group();
  const run = zoneRun(tr, 'bridge');
  if (!run) return g;
  const keep = (i: number): boolean => i >= run[0] && i <= run[1];
  const parapet = new MeshStandardMaterial({ color: 0x30333b, roughness: 0.6, metalness: 0.5, side: DoubleSide });
  const neon = new MeshBasicMaterial({ color: hdr(0xff2a9d, 2.4), side: DoubleSide });
  for (const side of [1, -1]) {
    g.add(new Mesh(wallStrip(tr, (i) => side * tr.wall[i], 0, 0.95, 6, keep), parapet));
    g.add(new Mesh(wallStrip(tr, (i) => side * (tr.wall[i] - 0.02), 0.95, 1.08, 6, keep), neon));
  }
  const water = new Mesh(ribbon(tr, -34, 34, -0.012, 12, (i) => i >= run[0] - 5 && i <= run[1] + 5), new MeshStandardMaterial({ color: 0x050c1c, roughness: 0.06, metalness: 0.9 }));
  g.add(water);
  const steel = new MeshStandardMaterial({ color: 0x4a505c, roughness: 0.5, metalness: 0.7 });
  const beam = new MeshBasicMaterial({ color: hdr(0x18d8ff, 2.4) });
  const d = new Object3D();
  for (const f of [0.15, 0.5, 0.85]) {
    const i = Math.round(run[0] + (run[1] - run[0]) * f);
    const s = tr.samples[i];
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);
    const w = tr.wall[i] + 0.25;
    for (const side of [-1, 1]) {
      const post = new Mesh(new BoxGeometry(0.35, 7.5, 0.35), steel);
      d.position.set(s.position.x + s.tangent.z * side * w, 3.75, s.position.z - s.tangent.x * side * w);
      post.position.copy(d.position);
      g.add(post);
    }
    const top = new Mesh(new BoxGeometry(w * 2 + 0.7, 0.4, 0.4), steel);
    top.position.set(s.position.x, 7.5, s.position.z);
    top.rotation.y = yaw;
    const glow = new Mesh(new BoxGeometry(w * 2, 0.08, 0.1), beam);
    glow.position.set(s.position.x, 7.25, s.position.z);
    glow.rotation.y = yaw;
    g.add(top, glow);
  }
  return g;
}
