import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, Points, ShaderMaterial, type Scene } from 'three';

export interface PoolOptions {
  max: number;
  additive: boolean;
  /** Y acceleration (m/s^2): negative falls, positive rises (smoke). */
  gravity: number;
  /** Velocity damping per second. */
  drag: number;
}

const VERT = `
attribute float size; attribute vec4 col;
varying vec4 vCol;
uniform float scale;
void main(){
  vCol = col;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_PointSize = size * scale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec4 vCol;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.2, d) * vCol.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol.rgb, a);
}`;

/** Fixed-size ring buffer of billboard particles drawn as one Points object. No allocation after construction. */
export class ParticlePool {
  readonly points: Points;
  private readonly o: PoolOptions;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly life: Float32Array; // remaining seconds
  private readonly total: Float32Array;
  private readonly s0: Float32Array;
  private readonly s1: Float32Array;
  private readonly a0: Float32Array;
  private readonly geo = new BufferGeometry();
  private head = 0;

  constructor(scene: Scene, o: PoolOptions) {
    this.o = o;
    const n = o.max;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.col = new Float32Array(n * 4);
    this.size = new Float32Array(n);
    this.life = new Float32Array(n);
    this.total = new Float32Array(n).fill(1);
    this.s0 = new Float32Array(n);
    this.s1 = new Float32Array(n);
    this.a0 = new Float32Array(n);
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3).setUsage(35048));
    this.geo.setAttribute('size', new BufferAttribute(this.size, 1).setUsage(35048));
    this.geo.setAttribute('col', new BufferAttribute(this.col, 4).setUsage(35048));
    const mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: o.additive ? AdditiveBlending : NormalBlending, uniforms: { scale: { value: 600 } },
    });
    this.points = new Points(this.geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** Point-size scale: roughly viewport height in pixels. */
  setScale(px: number): void {
    (this.points.material as ShaderMaterial).uniforms.scale.value = px;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size0: number, size1: number, r: number, g: number, b: number, a: number): void {
    const i = this.head;
    this.head = (i + 1) % this.o.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 4] = r; this.col[i * 4 + 1] = g; this.col[i * 4 + 2] = b;
    this.life[i] = life;
    this.total[i] = life;
    this.s0[i] = size0;
    this.s1[i] = size1;
    this.a0[i] = a;
    this.size[i] = size0;
  }

  update(dt: number): void {
    const n = this.o.max;
    const damp = Math.exp(-this.o.drag * dt);
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) {
        this.size[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const t = 1 - Math.max(0, this.life[i]) / this.total[i];
      this.vel[i * 3] *= damp;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * damp + this.o.gravity * dt;
      this.vel[i * 3 + 2] *= damp;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] = Math.max(0.02, this.pos[i * 3 + 1] + this.vel[i * 3 + 1] * dt);
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.col[i * 4 + 3] = this.a0[i] * (1 - t) * Math.min(1, t * 8);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    this.geo.attributes.col.needsUpdate = true;
  }
}
