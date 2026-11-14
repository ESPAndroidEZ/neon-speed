import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, type Scene } from 'three';

const WIDTH = 0.28;

/** Ring buffer of dark quads laid on the road behind sliding tyres. One mesh, no per-frame allocation. */
export class SkidMarks {
  readonly mesh: Mesh;
  private readonly pos: Float32Array;
  private readonly alpha: Float32Array;
  private readonly geo = new BufferGeometry();
  private readonly max: number;
  private head = 0;
  private dirty = false;

  constructor(scene: Scene, maxQuads = 1800) {
    this.max = maxQuads;
    this.pos = new Float32Array(maxQuads * 4 * 3);
    this.alpha = new Float32Array(maxQuads * 4);
    const idx = new Uint32Array(maxQuads * 6);
    for (let q = 0; q < maxQuads; q++) {
      const v = q * 4;
      idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], q * 6);
    }
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geo.setAttribute('alpha', new BufferAttribute(this.alpha, 1));
    this.geo.setIndex(new BufferAttribute(idx, 1));
    const mat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // per-quad fade via vertex alpha, injected into the standard basic shader
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute float alpha; varying float vA;\nvoid main() { vA = alpha;');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vA;\nvoid main() {').replace('#include <opaque_fragment>', '#include <opaque_fragment>\n gl_FragColor.a *= vA;');
    };
    this.mesh = new Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  /** Lay a quad from (x0,z0) to (x1,z1). `strength` 0..1 sets darkness. */
  add(x0: number, z0: number, x1: number, z1: number, strength: number): void {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.02 || len > 3) return;
    const nx = (-dz / len) * WIDTH;
    const nz = (dx / len) * WIDTH;
    const o = this.head * 12;
    const p = this.pos;
    const y = 0.045;
    p[o] = x0 + nx; p[o + 1] = y; p[o + 2] = z0 + nz;
    p[o + 3] = x0 - nx; p[o + 4] = y; p[o + 5] = z0 - nz;
    p[o + 6] = x1 + nx; p[o + 7] = y; p[o + 8] = z1 + nz;
    p[o + 9] = x1 - nx; p[o + 10] = y; p[o + 11] = z1 - nz;
    this.alpha.fill(strength, this.head * 4, this.head * 4 + 4);
    this.head = (this.head + 1) % this.max;
    this.dirty = true;
  }

  flush(): void {
    if (!this.dirty) return;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
    this.dirty = false;
  }

  clear(): void {
    this.pos.fill(0);
    this.alpha.fill(0);
    this.dirty = true;
  }
}
