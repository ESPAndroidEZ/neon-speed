import type { Scene } from 'three';
import { ParticlePool } from '../fx/particles';
import type { Placed } from './propsLayout';

/** Rising steam from street vents. Only vents near the camera emit, so the cost stays flat. */
export class Steam {
  private readonly pool: ParticlePool;
  private readonly vents: readonly Placed[];
  private acc = 0;

  constructor(scene: Scene, vents: readonly Placed[]) {
    this.pool = new ParticlePool(scene, { max: 500, additive: false, gravity: 1.4, drag: 0.8 });
    this.vents = vents;
  }

  update(dt: number, camX: number, camZ: number, viewportPx: number): void {
    this.pool.setScale(viewportPx * 0.9);
    this.acc += dt * 14;
    while (this.acc >= 1) {
      this.acc -= 1;
      for (const v of this.vents) {
        if (Math.abs(v.x - camX) > 90 || Math.abs(v.z - camZ) > 90) continue;
        this.pool.emit(v.x + (Math.random() - 0.5) * 0.4, 0.5, v.z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 1.4 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4, 2.2 + Math.random(), 0.5, 2.6, 0.7, 0.75, 0.85, 0.28);
      }
    }
    this.pool.update(dt);
  }
}
