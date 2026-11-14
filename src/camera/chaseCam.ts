import { PerspectiveCamera, Vector3 } from 'three';
import { clamp, damp, lerp, smoothstep, wrapAngle } from '../core/math';
import type { CameraPose, CameraRig, CarState } from '../types/game';

export interface ChaseTuning {
  distance: number;
  distanceFast: number;
  height: number;
  heightFast: number;
  fovMin: number;
  fovMax: number;
  nitroKick: number;
  /** Fraction of the slip angle the camera yaw follows. */
  slipFollow: number;
  /** Higher = camera yaw catches up faster. */
  yawLag: number;
  /** Speed (m/s) at which the "fast" values are fully reached. */
  fullSpeed: number;
}

export function createChaseTuning(): ChaseTuning {
  return {
    distance: 6.2,
    distanceFast: 8.4,
    height: 2.3,
    heightFast: 3.0,
    fovMin: 60,
    fovMax: 85,
    nitroKick: 8,
    slipFollow: 0.5,
    yawLag: 5,
    fullSpeed: 65,
  };
}

/**
 * Gameplay camera. step() does the smoothing (call once per display frame, always);
 * update() applies the resulting pose to the shared camera. `pose` is the live target
 * the cinematic uses for its handover whip.
 */
export class ChaseCam implements CameraRig {
  readonly camera: PerspectiveCamera;
  readonly tuning = createChaseTuning();
  private readonly _pose: CameraPose = { position: new Vector3(), lookAt: new Vector3(), fov: 60 };
  private yaw = 0;
  private dist: number;
  private height: number;
  private fov: number;
  private kick = 0;
  private car: CarState | null = null;
  private nitro = false;
  private ready = false;

  constructor(camera: PerspectiveCamera) {
    this.camera = camera;
    this.dist = this.tuning.distance;
    this.height = this.tuning.height;
    this.fov = this.tuning.fovMin;
  }

  get pose(): CameraPose {
    return this._pose;
  }

  /** Bind the car state and nitro flag source; snap on the next step. */
  setTarget(car: CarState): void {
    this.car = car;
    this.ready = false;
  }

  setNitro(active: boolean): void {
    this.nitro = active;
  }

  step(frameDt: number): void {
    const car = this.car;
    if (!car) return;
    const t = this.tuning;
    const sp = smoothstep(0, t.fullSpeed, Math.abs(car.speed));
    const slip = clamp(car.slipAngle, -1.1, 1.1);
    const targetYaw = car.heading + t.slipFollow * slip * smoothstep(3, 10, Math.abs(car.speed));
    if (!this.ready) {
      this.yaw = targetYaw;
      this.dist = t.distance;
      this.height = t.height;
      this.fov = t.fovMin;
      this.ready = true;
    }
    this.yaw += wrapAngle(targetYaw - this.yaw) * (1 - Math.exp(-t.yawLag * frameDt));
    this.dist = damp(this.dist, lerp(t.distance, t.distanceFast, sp), 3, frameDt);
    this.height = damp(this.height, lerp(t.height, t.heightFast, sp), 3, frameDt);
    this.kick = damp(this.kick, this.nitro ? t.nitroKick : 0, this.nitro ? 4 : 2, frameDt);
    this.fov = damp(this.fov, lerp(t.fovMin, t.fovMax, sp) + this.kick, 4, frameDt);

    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const p = car.position;
    this._pose.position.set(p.x - sy * this.dist, this.height, p.z - cy * this.dist);
    this._pose.lookAt.set(p.x + sy * 4, 1.0, p.z + cy * 4);
    this._pose.fov = this.fov;
  }

  update(frameDt: number): void {
    this.step(frameDt);
    const c = this.camera;
    c.position.copy(this._pose.position);
    c.lookAt(this._pose.lookAt);
    if (Math.abs(c.fov - this._pose.fov) > 0.01) {
      c.fov = this._pose.fov;
      c.updateProjectionMatrix();
    }
  }
}
