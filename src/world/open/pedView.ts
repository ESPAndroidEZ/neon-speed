import { BoxGeometry, BufferGeometry, Color, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RoamPeds } from '../../physics/roamPeds';
import { heightAt } from '../roads/height';

const CLOTHES = [0x2a2d3a, 0x6b2235, 0x1f4a5a, 0xb08a3a, 0x3d3d3d, 0x7a7f88, 0x5a2a6b, 0x1e2a1e];

/** Pedestrians as one instanced mesh (one draw call): a simple figure (body, head) with a walking bob. No allocation per frame. */
export class PedView {
  readonly mesh: InstancedMesh;
  private readonly tmp = new Object3D();
  private readonly geo: BufferGeometry;
  private readonly mat = new MeshStandardMaterial({ roughness: 0.8 });

  constructor(count: number) {
    const body = new BoxGeometry(0.46, 1.15, 0.28).translate(0, 0.95, 0);
    const legs = new BoxGeometry(0.36, 0.4, 0.22).translate(0, 0.2, 0);
    const head = new BoxGeometry(0.24, 0.26, 0.24).translate(0, 1.68, 0);
    this.geo = mergeGeometries([body, legs, head]) as BufferGeometry;
    for (const g of [body, legs, head]) g.dispose();
    this.mesh = new InstancedMesh(this.geo, this.mat, count);
    const c = new Color();
    for (let i = 0; i < count; i++) this.mesh.setColorAt(i, c.setHex(CLOTHES[(i * 5) % CLOTHES.length]));
    this.mesh.frustumCulled = false;
    this.mesh.name = 'pedestrians';
  }

  update(p: RoamPeds): void {
    const o = this.tmp;
    for (let i = 0; i < p.count; i++) {
      o.position.set(p.x[i], heightAt(p.x[i], p.z[i]) + 0.16 + Math.abs(Math.sin(p.phase[i])) * 0.05, p.z[i]); // on the kerb height
      o.rotation.set(0, p.h[i], Math.sin(p.phase[i]) * 0.04);
      o.updateMatrix();
      this.mesh.setMatrixAt(i, o.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
