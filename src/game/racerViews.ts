import { Group, type Scene, type Texture } from 'three';
import { disposeVisual } from '../world/disposeVisual';
import type { CarSpec } from '../data/cars';
import type { Racer } from '../core/raceManager';
import { createCarVisual } from '../world/carFactory';
import { getLoadout } from '../world/loadoutStore';
import { defaultLoadout } from '../data/loadout';
import { applyCarLod } from '../world/carLod';
import type { CarVisual } from '../world/proceduralCar';

export interface RacerView {
  racer: Racer;
  spec: CarSpec;
  holder: Group;
  visual: CarVisual;
  /** Interpolated world pose, valid after update(). */
  x: number;
  z: number;
  heading: number;
  longAccel: number;
  lastSpeed: number;
}

/** A rival's own plate from its name: two letters and four digits (e.g. DANTE -> DA-4821), stable per name. */
export function rivalPlate(name: string): string {
  const letters = (name.toUpperCase().replace(/[^A-Z]/g, '') + 'XX').slice(0, 2);
  let h = 7;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `${letters}-${String(1000 + (h % 9000))}`;
}

/** One visual car per racer, posed by interpolating the physics state between fixed steps. */
export class RacerViews {
  readonly views: RacerView[] = [];
  /** Body roll and pitch exaggeration (bad weather makes the cars lean and dive more). */
  rollScale = 1;
  /** Fired after a GLB replaces a procedural body (the garage re-applies calibration state). */
  onSwap: ((v: RacerView) => void) | null = null;
  private readonly scene: Scene;
  private readonly env: Texture;
  private readonly tmp = { x: 0, y: 0, z: 0 };

  constructor(scene: Scene, env: Texture) {
    this.scene = scene;
    this.env = env;
  }

  add(racer: Racer, spec: CarSpec, paint: number, glow = 0x2a6bff): RacerView {
    const holder = new Group();
    let v: RacerView;
    const visual = createCarVisual(spec, paint, glow, this.env, (nv) => this.swap(v, nv), racer.isPlayer ? getLoadout(spec.id) : { ...defaultLoadout(), plate: rivalPlate(racer.name) });
    holder.add(visual.root);
    this.scene.add(holder);
    v = { racer, spec, holder, visual, x: 0, z: 0, heading: 0, longAccel: 0, lastSpeed: 0 };
    this.views.push(v);
    return v;
  }

  /** Replace a car's visual in place (procedural body -> loaded GLB). */
  private swap(v: RacerView, nv: CarVisual): void {
    if (!this.views.includes(v)) return;
    v.holder.remove(v.visual.root);
    disposeVisual(v.visual.root); // the procedural body it replaces
    v.holder.add(nv.root);
    v.visual = nv;
    this.onSwap?.(v);
  }

  clear(): void {
    for (const v of this.views) {
      this.scene.remove(v.holder);
      disposeVisual(v.holder); // ~70 geometries per car: leaked on every race before (GPU memory, then a crash)
    }
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
      v.holder.position.set(v.x, this.tmp.y, v.z);
      v.holder.rotation.order = 'YXZ';
      v.holder.rotation.y = v.heading;
      v.holder.rotation.x = -v.racer.contact.pitch;
      const inp = v.racer.input;
      applyCarLod(v.visual.root, v.x, v.z);
      v.visual.update(frameDt, car.state.speed, inp.steer, inp.brake > 0.1 && car.state.speed > 1, v.longAccel * this.rollScale, car.lateralAccel * this.rollScale);
    }
  }
}
