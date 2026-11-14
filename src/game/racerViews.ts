import { Group, type Scene, type Texture } from 'three';
import type { CarSpec } from '../data/cars';
import type { Racer } from '../core/raceManager';
import { buildProceduralCar, type CarVisual } from '../world/proceduralCar';

export interface RacerView {
  racer: Racer;
  holder: Group;
  visual: CarVisual;
  /** Interpolated world pose, valid after update(). */
  x: number;
  z: number;
  heading: number;
  longAccel: number;
  lastSpeed: number;
}

/** One visual car per racer, posed by interpolating the physics state between fixed steps. */
export class RacerViews {
  readonly views: RacerView[] = [];
  private readonly scene: Scene;
  private readonly env: Texture;
  private readonly tmp = { x: 0, y: 0, z: 0 };

  constructor(scene: Scene, env: Texture) {
    this.scene = scene;
    this.env = env;
  }

  add(racer: Racer, spec: CarSpec, paint: number): RacerView {
    const holder = new Group();
    const visual = buildProceduralCar(spec.shape, paint);
    visual.setEnv(this.env);
    holder.add(visual.root);
    this.scene.add(holder);
    const v: RacerView = { racer, holder, visual, x: 0, z: 0, heading: 0, longAccel: 0, lastSpeed: 0 };
    this.views.push(v);
    return v;
  }

  clear(): void {
    for (const v of this.views) this.scene.remove(v.holder);
    this.views.length = 0;
  }

  /** Call once per fixed step after physics: smoothed longitudinal acceleration for body pitch. */
  fixedStep(dt: number): void {
    for (const v of this.views) {
      const s = v.racer.car.state.speed;
      v.longAccel += ((s - v.lastSpeed) / dt - v.longAccel) * 0.2;
      v.lastSpeed = s;
    }
  }

  update(alpha: number, frameDt: number): void {
    for (const v of this.views) {
      const car = v.racer.car;
      v.heading = car.readPose(alpha, this.tmp);
      v.x = this.tmp.x;
      v.z = this.tmp.z;
      v.holder.position.set(v.x, 0, v.z);
      v.holder.rotation.y = v.heading;
      const inp = v.racer.input;
      v.visual.update(frameDt, car.state.speed, inp.steer, inp.brake > 0.1 && car.state.speed > 1, v.longAccel, car.lateralAccel);
    }
  }
}
