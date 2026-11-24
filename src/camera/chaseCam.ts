import { PerspectiveCamera, Vector3 } from 'three';
import { clamp, damp, lerp, smoothstep, wrapAngle } from '../core/math';
import type { CameraPose, CameraRig, CarState } from '../types/game';
import { framing } from './aspectFrame';
import type { Framing } from './aspectFrame';

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
  /** Camera shake multiplier (settings: Off 0, Low 0.5, Normal 1). Shake comes only from impacts and big slides. */
  shake: number;
}

/** Hard cap on the shake displacement per axis, metres. */
const MAX_OFFSET = 0.3;

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
    shake: 0.5,
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
  /** Smoothed road height under the car: the camera climbs hills with it. */
  private gy = 0;
  private fov: number;
  private kick = 0;
  private car: CarState | null = null;
  private nitro = false;
  private ready = false;
  private shakeAmp = 0;
  private shakeT = 0;
  private slideAmp = 0;
  private slipFilt = 0;
  /** Speed fraction for the zoom: it follows speed up quickly but eases down slowly, so a long handbrake slide does not pull the camera in (owner 2026-11-21). */
  private spFilt = 0;
  /** Per-aspect framing (portrait pulls back and widens, ultrawide caps the horizontal view). */
  private readonly frame: Framing = { fov: 60, dist: 1, height: 1, lookAhead: 0 };

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

  /** Camera shake impulse (0..1); decays on its own. */
  addShake(amount: number): void {
    this.shakeAmp = Math.min(1, this.shakeAmp + amount * this.tuning.shake);
  }

  /**
   * Feed the slip angle every display frame. Only a LARGE slide (> ~0.5 rad at speed) shakes the camera, and the
   * amplitude is low-passed and capped: plain acceleration, wheelspin or a small slip never does.
   */
  feedSlide(slip: number, speed: number, dt: number): void {
    const big = smoothstep(0.5, 0.95, Math.abs(slip)) * smoothstep(10, 25, Math.abs(speed));
    this.slideAmp = damp(this.slideAmp, big * 0.22 * this.tuning.shake, 3, dt);
  }

  setNitro(active: boolean): void {
    this.nitro = active;
  }

  step(frameDt: number): void {
    const car = this.car;
    if (!car) return;
    const t = this.tuning;
    const sp0 = smoothstep(0, t.fullSpeed, Math.abs(car.speed));
    this.spFilt = this.ready ? damp(this.spFilt, sp0, sp0 > this.spFilt ? 3 : 0.45, frameDt) : sp0;
    const sp = this.spFilt;
    // camera yaw follows a filtered slip: a dead zone ignores wheelspin wag, and a low-pass removes oscillation
    const raw = clamp(car.slipAngle, -1.1, 1.1);
    this.slipFilt = damp(this.slipFilt, Math.sign(raw) * Math.max(0, Math.abs(raw) - 0.1), 4, frameDt);
    const slip = this.slipFilt;
    const fr = framing(this.camera.aspect, lerp(t.fovMin, t.fovMax, sp) + this.kick, this.frame);
    const targetYaw = car.heading + t.slipFollow * slip * smoothstep(3, 10, Math.abs(car.speed));
    if (!this.ready) {
      this.yaw = targetYaw;
      this.dist = t.distance * fr.dist;
      this.height = t.height * fr.height;
      this.gy = car.position.y;
      this.fov = fr.fov;
      this.ready = true;
    }
    this.yaw += wrapAngle(targetYaw - this.yaw) * (1 - Math.exp(-t.yawLag * frameDt));
    this.dist = damp(this.dist, lerp(t.distance, t.distanceFast, sp) * fr.dist, 3, frameDt);
    this.height = damp(this.height, lerp(t.height, t.heightFast, sp) * fr.height, 3, frameDt);
    this.kick = damp(this.kick, this.nitro ? t.nitroKick : 0, this.nitro ? 4 : 2, frameDt);
    this.fov = damp(this.fov, fr.fov, 4, frameDt);

    this.gy = damp(this.gy, car.position.y, 5, frameDt);
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const p = car.position;
    this._pose.position.set(p.x - sy * this.dist, this.height + this.gy, p.z - cy * this.dist);
    const ahead = 4 + fr.lookAhead;
    this._pose.lookAt.set(p.x + sy * ahead, 1.0 + this.gy, p.z + cy * ahead);
    this._pose.fov = this.fov;
  }

  update(frameDt: number): void {
    this.step(frameDt);
    const c = this.camera;
    c.position.copy(this._pose.position);
    const amp = Math.min(MAX_OFFSET, this.shakeAmp * 0.45 + this.slideAmp);
    if (amp > 0.002) {
      this.shakeT += frameDt;
      this.shakeAmp *= Math.exp(-7 * frameDt);
      const t = this.shakeT;
      // low-frequency wobble (about 1 to 1.5 Hz plus a little 4 Hz): a camera sway, not a vibration
      c.position.x += clamp((Math.sin(t * 9) + Math.sin(t * 5.3 + 1.3)) * 0.5 * amp, -MAX_OFFSET, MAX_OFFSET);
      c.position.y += clamp((Math.sin(t * 7.4 + 0.7) + Math.sin(t * 4.1)) * 0.5 * amp, -MAX_OFFSET, MAX_OFFSET);
      c.position.z += clamp(Math.sin(t * 6.2 + 2.1) * 0.5 * amp, -MAX_OFFSET, MAX_OFFSET);
    }
    c.lookAt(this._pose.lookAt);
    if (c.fov !== this._pose.fov) {
      c.fov = this._pose.fov; // every frame: a dead band would turn the smooth zoom into visible steps
      c.updateProjectionMatrix();
    }
  }
}
