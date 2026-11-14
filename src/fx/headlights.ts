import { Object3D, SpotLight, type Scene } from 'three';
import { grade } from '../core/grade';
import { qualityNow } from '../core/quality';
import type { RacerView } from '../game/racerViews';

/** Two pooled headlight SpotLights, assigned each frame to the player's car and the nearest rival. Allocated once. */
export class HeadlightPool {
  private readonly lights: SpotLight[] = [];
  private readonly targets: Object3D[] = [];

  constructor(scene: Scene) {
    for (let i = 0; i < 2; i++) {
      const l = new SpotLight(0xdff0ff, 300, 50, 0.5, 0.7, 1.8);
      l.castShadow = false;
      const t = new Object3D();
      l.target = t;
      l.visible = false;
      scene.add(l, t);
      this.lights.push(l);
      this.targets.push(t);
    }
  }

  update(views: readonly RacerView[], enabled = true): void {
    const n = enabled ? qualityNow().spotLights : 0;
    const player = views.find((v) => v.racer.isPlayer);
    let rival: RacerView | null = null;
    let best = Infinity;
    if (player) {
      for (const v of views) {
        if (v === player) continue;
        const d = (v.x - player.x) ** 2 + (v.z - player.z) ** 2;
        if (d < best) {
          best = d;
          rival = v;
        }
      }
    }
    for (const l of this.lights) {
      l.intensity = 300 * grade.spotK;
      l.angle = grade.spotAngle;
    }
    this.assign(0, n >= 1 ? player ?? null : null);
    this.assign(1, n >= 2 ? rival : null);
  }

  private assign(i: number, v: RacerView | null): void {
    const l = this.lights[i];
    l.visible = v !== null;
    if (!v) return;
    const sh = Math.sin(v.heading);
    const ch = Math.cos(v.heading);
    l.position.set(v.x + sh * 2, 0.75, v.z + ch * 2);
    this.targets[i].position.set(v.x + sh * 28, 0.2, v.z + ch * 28);
  }
}
