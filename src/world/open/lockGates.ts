import { BoxGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import type { DistrictId, RoadGraph } from '../../types/world';
import { districtAt } from '../../data/world/districtMap';
import { heightAt } from '../roads/height';

const MAX = 400;
/** Where roads cross into another district: point, road heading, width, and the two districts. Computed once per city. */
interface Crossing { x: number; z: number; h: number; w: number; a: DistrictId; b: DistrictId }

export function roadCrossings(g: RoadGraph): Crossing[] {
  const out: Crossing[] = [];
  for (const e of g.edges) {
    if (e.ys) continue; // bridge decks: the border sits on land at either end
    let last: DistrictId | null = null, lx = 0, lz = 0;
    for (let k = 0; k + 1 < e.pts.length / 2; k++) {
      const x0 = e.pts[k * 2], z0 = e.pts[k * 2 + 1], x1 = e.pts[k * 2 + 2], z1 = e.pts[k * 2 + 3], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 4));
      for (let q = 0; q <= n; q++) {
        const x = x0 + ((x1 - x0) * q) / n, z = z0 + ((z1 - z0) * q) / n, d = districtAt(x, z);
        if (last && d !== last) out.push({ x: (x + lx) / 2, z: (z + lz) / 2, h: Math.atan2(x1 - x0, z1 - z0), w: e.width + 2, a: last, b: d });
        last = d; lx = x; lz = z;
      }
    }
  }
  return out;
}

/**
 * Red barriers across every road into a district that is still locked (Free Drive, REP areas): one instanced mesh, rebuilt
 * when the set of locked districts changes. The guard in game/roamFlow does the stopping; this shows where it is.
 */
export class LockGates {
  readonly mesh: InstancedMesh;
  private readonly crossings: Crossing[];
  private key = '';
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly up = new Vector3(0, 1, 0);

  constructor(g: RoadGraph) {
    this.crossings = roadCrossings(g);
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0xff2a55 }), MAX);
    this.mesh.name = 'lock-gates';
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  /** Show the gates for this lock state (`locked(d)`); cheap when nothing changed. */
  update(locked: (d: DistrictId) => boolean, key: string): void {
    if (key === this.key) return;
    this.key = key;
    let n = 0;
    for (const c of this.crossings) {
      if (n >= MAX || locked(c.a) === locked(c.b)) continue; // only borders between an open and a locked district
      this.q.setFromAxisAngle(this.up, c.h);
      this.p.set(c.x, heightAt(c.x, c.z) + 0.55, c.z);
      this.s.set(c.w, 1.1, 0.4);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(n++, this.m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}
