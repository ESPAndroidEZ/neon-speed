import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { RoadGraph } from '../../types/world';
import type { RoamTraffic } from '../../physics/roamTraffic';
import { lightFor } from '../../physics/roamTraffic';
import { heightAt } from '../roads/height';
import { TRAFFIC_VARIANTS, trafficShape } from './trafficShapes';
import { trafficSize } from '../../physics/trafficSize';

/** Body paints of the traffic cars (muted, so the player's car stands out). */
const PAINT = [0x2b2f3a, 0x8a8f99, 0x4a1c22, 0x1d3550, 0xc9c6bd, 0x3a3f2a, 0x0f1115, 0x5a4630];
const TAXI = 0xd9a520; // taxis are yellow
const V = TRAFFIC_VARIANTS.length;
const LIGHT_COL = [0x39ff88, 0xffc23a, 0xff2a3a]; // green, yellow, red
const MAX_HEADS = 96;

/** Low-poly saloon: body box + cabin box (one geometry), and its lamps: white front, red rear quads with vertex colours. */
export function carShapes(): { body: BufferGeometry; lamps: BufferGeometry } {
  const lower = new BoxGeometry(1.8, 0.7, 4.4).translate(0, 0.55, 0);
  const cabin = new BoxGeometry(1.6, 0.55, 2.2).translate(0, 1.15, -0.2);
  const body = mergeGeometries([lower, cabin]) as BufferGeometry;
  const quad = (z: number, ry: number, r: number, g: number, b: number): BufferGeometry => {
    const q = new PlaneGeometry(1.5, 0.22).rotateY(ry).translate(0, 0.7, z);
    const n = q.getAttribute('position').count;
    q.setAttribute('color', new Float32BufferAttribute(new Array(n).fill(0).flatMap(() => [r, g, b]), 3));
    return q;
  };
  const lamps = mergeGeometries([quad(2.21, 0, 1.4, 1.35, 1.2), quad(-2.21, Math.PI, 1.6, 0.08, 0.08)]) as BufferGeometry;
  return { body, lamps };
}

/**
 * City traffic and traffic lights as instanced meshes (7 draw calls): one body mesh per vehicle shape (task 067: saloon,
 * hatch, van, taxi, pickup; per-instance paint), all car lamps in one mesh (the saloon's lamps scaled to each shape),
 * and one lamp head per approach axis at each lit junction near the player. No allocation per frame.
 */
export class TrafficView {
  readonly group = new Group();
  private readonly bodies: InstancedMesh[];
  /** Per agent: which body mesh and which slot in it (filled on the first update: shapes never change). */
  private slot: Int16Array | null = null;
  private readonly lamps: InstancedMesh;
  private readonly heads: InstancedMesh;
  private readonly tmp = new Object3D();
  private readonly col = new Color();
  private readonly lit: number[];
  private readonly g: RoadGraph;
  private readonly dispose0: () => void;

  constructor(g: RoadGraph, count: number) {
    this.g = g;
    const s = carShapes();
    const shapes = TRAFFIC_VARIANTS.map((v) => trafficShape(v));
    const bodyMat = new MeshStandardMaterial({ roughness: 0.45, metalness: 0.5 });
    const lampMat = new MeshBasicMaterial({ vertexColors: true });
    const headMat = new MeshBasicMaterial();
    const headGeo = new BoxGeometry(0.5, 0.5, 0.5);
    this.bodies = shapes.map((sh) => new InstancedMesh(sh.body, bodyMat, count));
    this.lamps = new InstancedMesh(s.lamps, lampMat, count);
    this.heads = new InstancedMesh(headGeo, headMat, MAX_HEADS);
    for (let i = 0; i < MAX_HEADS; i++) this.heads.setColorAt(i, this.col.setHex(LIGHT_COL[0]));
    for (const m of [...this.bodies, this.lamps, this.heads]) { m.frustumCulled = false; this.group.add(m); }
    for (const b of this.bodies) b.count = 0;
    this.group.name = 'traffic';
    this.lit = g.nodes.filter((n) => n.light).map((n) => n.id);
    this.dispose0 = () => { for (const x of [s.body, s.lamps, headGeo, ...shapes.flatMap((sh) => [sh.body, sh.lamps])]) x.dispose(); for (const x of [bodyMat, lampMat, headMat]) x.dispose(); };
  }

  /** Once: each agent's body mesh and slot, paint per slot (taxis yellow). */
  private assign(t: RoamTraffic): Int16Array {
    const slot = new Int16Array(t.agents.length * 2);
    for (const b of this.bodies) b.count = 0;
    for (let i = 0; i < t.agents.length; i++) {
      const v = t.agents[i].variant % V, b = this.bodies[v], k = Math.min(b.count, b.instanceMatrix.count - 1);
      slot[i * 2] = v; slot[i * 2 + 1] = k;
      b.setColorAt(k, this.col.setHex(TRAFFIC_VARIANTS[v] === 'taxi' ? TAXI : PAINT[i % PAINT.length]));
      b.count = k + 1;
    }
    return slot;
  }

  /** Copy the traffic poses into the instances; light heads for the lit junctions within 260 m of (px, pz). */
  update(t: RoamTraffic, px: number, pz: number): void {
    const o = this.tmp, slot = (this.slot ??= this.assign(t));
    for (let i = 0; i < t.agents.length; i++) {
      const sz = trafficSize(t.agents[i].variant);
      o.position.set(t.x[i], heightAt(t.x[i], t.z[i]), t.z[i]);
      o.rotation.set(0, t.h[i], 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      this.bodies[slot[i * 2]].setMatrixAt(slot[i * 2 + 1], o.matrix);
      o.scale.set(sz[0] / 1.8, 1, sz[1] / 4.4); // the saloon's lamps stretched to this shape
      o.updateMatrix();
      this.lamps.setMatrixAt(i, o.matrix);
    }
    o.scale.set(1, 1, 1); // the light heads below use the same object
    for (const b of this.bodies) b.instanceMatrix.needsUpdate = true;
    this.lamps.instanceMatrix.needsUpdate = true;
    let k = 0;
    for (let j = 0; j < this.lit.length && k + 2 <= MAX_HEADS; j++) {
      const n = this.g.nodes[this.lit[j]];
      if (Math.abs(n.x - px) > 260 || Math.abs(n.z - pz) > 260) continue;
      const y = heightAt(n.x, n.z) + 5.2, off = n.radius * 0.75;
      for (let axis = 0; axis < 2; axis++) { // one head facing the z-axis traffic, one facing the x-axis traffic
        o.position.set(n.x + (axis ? 0 : off), y, n.z + (axis ? off : 0));
        o.rotation.set(0, 0, 0);
        o.updateMatrix();
        this.heads.setMatrixAt(k, o.matrix);
        this.heads.setColorAt(k, this.col.setHex(LIGHT_COL[lightFor(n, t.time, axis ? 0 : 1, axis ? 1 : 0)]));
        k++;
      }
    }
    this.heads.count = k;
    this.heads.instanceMatrix.needsUpdate = true;
    if (this.heads.instanceColor) this.heads.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.dispose0();
  }
}
