import { AdditiveBlending, BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, type Scene } from 'three';
import { smoothstep } from '../core/math';
import type { PrecipState } from './precipMath';

const WIND = 160;

/**
 * White wind lines racing past the camera at high speed. Laid out along the camera's (cut-safe, smoothed) travel
 * direction and relative to the camera height, so they follow hills and never flip on a camera cut.
 */
export class WindLines {
  readonly lines: LineSegments<BufferGeometry, LineBasicMaterial>;
  private readonly local = new Float32Array(WIND * 3);
  private readonly pos = new Float32Array(WIND * 6);
  private fx = 0;
  private fz = 1;

  constructor(scene: Scene) {
    for (let i = 0; i < WIND; i++) {
      this.local[i * 3] = (Math.random() - 0.5) * 16;
      this.local[i * 3 + 1] = -1.5 + Math.random() * 6;
      this.local[i * 3 + 2] = Math.random() * 40 - 10;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(this.pos, 3).setUsage(35048));
    this.lines = new LineSegments(geo, new LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    scene.add(this.lines);
  }

  update(dt: number, s: PrecipState, speed: number, on: boolean, showcase: boolean): void {
    const vis = showcase ? 1 : smoothstep(34, 70, speed);
    this.lines.material.opacity = vis * 0.4;
    this.lines.visible = on && vis > 0.02;
    if (!this.lines.visible) return;
    const hv = Math.hypot(s.vx, s.vz);
    if (hv > 2) {
      this.fx = s.vx / hv;
      this.fz = s.vz / hv;
    }
    const { fx, fz, local: wl, pos } = this;
    const len = 1.5 + speed * 0.08;
    for (let i = 0; i < WIND; i++) {
      const o = i * 3;
      wl[o + 2] -= (speed * 1.6 + 8) * dt;
      if (wl[o + 2] < -10) wl[o + 2] += 40;
      const lx = wl[o];
      const lz = wl[o + 2];
      const wx = s.px + fz * lx + fx * lz;
      const wz = s.pz - fx * lx + fz * lz;
      const y = s.py + wl[o + 1];
      const p6 = i * 6;
      pos[p6] = wx; pos[p6 + 1] = y; pos[p6 + 2] = wz;
      pos[p6 + 3] = wx + fx * len; pos[p6 + 4] = y; pos[p6 + 5] = wz + fz * len;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }

  dispose(scene: Scene): void {
    scene.remove(this.lines);
    this.lines.geometry.dispose();
    this.lines.material.dispose();
  }
}
