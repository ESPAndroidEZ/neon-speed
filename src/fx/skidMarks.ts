import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, type Scene } from 'three';

const WIDTH = 0.3;
/** Seconds a mark takes to fade out completely. */
export const SKID_LIFE = 28;

/** Ring buffer of dark quads laid behind sliding tyres; each fades with age in the shader. No per-frame allocation. */
export class SkidMarks {
  readonly mesh: Mesh;
  private readonly pos: Float32Array;
  private readonly strength: Float32Array;
  private readonly birth: Float32Array;
  private readonly geo = new BufferGeometry();
  private readonly max: number;
  private readonly uTime = { value: 0 };
  private head = 0;
  private dirty = false;
  private now = 0;

  constructor(scene: Scene, maxQuads = 2200) {
    this.max = maxQuads;
    this.pos = new Float32Array(maxQuads * 12);
    this.strength = new Float32Array(maxQuads * 4);
    this.birth = new Float32Array(maxQuads * 4).fill(-1e6);
    const idx = new Uint32Array(maxQuads * 6);
    for (let q = 0; q < maxQuads; q++) idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4 + 1, q * 4 + 3, q * 4 + 2], q * 6);
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.geo.setAttribute('strength', new BufferAttribute(this.strength, 1));
    this.geo.setAttribute('birth', new BufferAttribute(this.birth, 1));
    this.geo.setIndex(new BufferAttribute(idx, 1));
    const mat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute float strength; attribute float birth; uniform float uTime; varying float vA;\nvoid main() { vA = strength * clamp(1.0 - (uTime - birth) / ' + SKID_LIFE.toFixed(1) + ', 0.0, 1.0);');
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
    this.strength.fill(strength, this.head * 4, this.head * 4 + 4);
    this.birth.fill(this.now, this.head * 4, this.head * 4 + 4);
    this.head = (this.head + 1) % this.max;
    this.dirty = true;
  }

  /** Advance the fade clock; upload buffers if new marks were added. */
  update(dt: number): void {
    this.now += dt;
    this.uTime.value = this.now;
    if (!this.dirty) return;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.strength.needsUpdate = true;
    this.geo.attributes.birth.needsUpdate = true;
    this.dirty = false;
  }

  clear(): void {
    this.pos.fill(0);
    this.strength.fill(0);
    this.dirty = true;
  }
}
