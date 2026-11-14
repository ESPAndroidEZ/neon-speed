import { Euler, Quaternion, Vector3, type CatmullRomCurve3, type Object3D, type PerspectiveCamera } from 'three';
import { clamp, easeInOutCubic, lerp } from '../core/math';
import type { CameraPose, CameraRig } from '../types/game';
import { addShake, buildCurves, copyPose, makePose, samplePath } from './shotSampler';
import type { CameraShot } from './shots';

const UP = new Vector3(0, 1, 0);

type Phase = 'idle' | 'shots' | 'handover' | 'done';

export interface CinematicOptions {
  /** Engine's camera. The cinematic rig and the chase rig share it. */
  camera: PerspectiveCamera;
  /** The car (any Object3D). Shots are authored relative to its position and yaw. */
  subject: Object3D;
  shots: readonly CameraShot[];
  /** Live pose the gameplay chase camera wants. Sampled every frame during the handover whip. */
  handover: () => CameraPose;
  /** Seconds for the whip from the last shot into the chase view. Default 0.7. */
  handoverTime?: number;
  /** Extra degrees of FOV at the middle of the whip, for speed. Default 9. */
  fovKick?: number;
}

/**
 * Plays a sequence of hard-cut, spline/orbit shots around a subject, then whips the camera
 * into the gameplay chase pose and hands control over via `onComplete`.
 *
 * Drive `update()` once per display frame. The sequence is purely time-parametrised, so it
 * stays smooth at any refresh rate.
 */
export class CinematicCam implements CameraRig {
  readonly camera: PerspectiveCamera;
  /** Fires on every hard cut, including the first shot. Hook SFX, bloom kick, letterbox, etc. */
  onShotChange?: (index: number, shot: CameraShot) => void;
  /** Fires once, on the frame the camera lands exactly on the handover pose. */
  onComplete?: () => void;

  private readonly subject: Object3D;
  private readonly shots: readonly CameraShot[];
  private readonly curves: (CatmullRomCurve3 | undefined)[];
  private readonly handover: () => CameraPose;
  private readonly handoverTime: number;
  private readonly fovKick: number;

  private phase: Phase = 'idle';
  private shotIndex = 0;
  private shotTime = 0;
  private blendTime = 0;
  private clock = 0;
  private notified = false;

  private yaw = 0;
  private readonly origin = new Vector3();
  private readonly quat = new Quaternion();
  private readonly euler = new Euler();
  private readonly local = new Vector3();
  private readonly focus = new Vector3();
  private readonly pose = makePose();
  private readonly from = makePose();

  constructor(o: CinematicOptions) {
    if (o.shots.length === 0) throw new Error('CinematicCam needs at least one shot');
    if (o.shots.some((s) => s.duration <= 0)) throw new Error('CinematicCam shot durations must be > 0');
    this.camera = o.camera;
    this.subject = o.subject;
    this.shots = o.shots;
    this.handover = o.handover;
    this.handoverTime = o.handoverTime ?? 0.7;
    this.fovKick = o.fovKick ?? 9;
    this.curves = buildCurves(o.shots);
  }

  get isActive(): boolean {
    return this.phase === 'shots' || this.phase === 'handover';
  }

  get currentShot(): CameraShot | undefined {
    return this.phase === 'shots' ? this.shots[this.shotIndex] : undefined;
  }

  /** (Re)start the sequence. Places the camera on shot 0 immediately, so the first rendered frame is correct. */
  start(): void {
    this.clock = 0;
    this.shotTime = 0;
    this.notified = false;
    this.phase = 'shots';
    this.enterShot(0);
    this.update(0);
  }

  /** Tap-to-skip: whip from wherever the camera is into the chase view. A second call finishes immediately. */
  skip(): void {
    if (this.phase === 'shots') this.beginHandover();
    else if (this.phase === 'handover') this.blendTime = this.handoverTime;
  }

  update(frameDt: number): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.clock += frameDt;
    this.syncSubject();
    if (this.phase === 'shots') this.updateShots(frameDt);
    else this.updateHandover(frameDt);
    this.apply();
    if (this.finished && !this.notified) {
      this.notified = true;
      this.onComplete?.();
    }
  }

  /** A getter, so TypeScript doesn't keep the narrowed `phase` from the early return in update(). */
  private get finished(): boolean {
    return this.phase === 'done';
  }

  private enterShot(index: number): void {
    this.shotIndex = index;
    this.onShotChange?.(index, this.shots[index]);
  }

  private updateShots(dt: number): void {
    this.shotTime += dt;
    let shot = this.shots[this.shotIndex];
    // Loop so a long frame can carry overflow across one or more cuts.
    while (this.shotTime >= shot.duration) {
      this.shotTime -= shot.duration;
      if (this.shotIndex + 1 >= this.shots.length) {
        this.evaluate(shot, 1);
        this.beginHandover();
        this.updateHandover(this.shotTime);
        return;
      }
      this.enterShot(this.shotIndex + 1);
      shot = this.shots[this.shotIndex];
    }
    this.evaluate(shot, this.shotTime / shot.duration);
  }

  private beginHandover(): void {
    copyPose(this.pose, this.from);
    this.phase = 'handover';
    this.blendTime = 0;
  }

  private updateHandover(dt: number): void {
    this.blendTime += dt;
    const u = clamp(this.blendTime / this.handoverTime, 0, 1);
    const e = easeInOutCubic(u);
    const target = this.handover();
    this.pose.position.lerpVectors(this.from.position, target.position, e);
    this.pose.lookAt.lerpVectors(this.from.lookAt, target.lookAt, e);
    this.pose.fov = lerp(this.from.fov, target.fov, e) + Math.sin(Math.PI * u) * this.fovKick;
    this.pose.roll = lerp(this.from.roll, 0, e);
    if (u >= 1) this.phase = 'done';
  }

  private evaluate(shot: CameraShot, t: number): void {
    const u = shot.ease(clamp(t, 0, 1));
    const curve = this.curves[this.shotIndex];
    this.toWorld(samplePath(shot.path, curve, u, this.local), this.pose.position);
    this.focus.lerpVectors(shot.focus[0], shot.focus[1], u);
    this.toWorld(this.focus, this.pose.lookAt);
    this.pose.fov = lerp(shot.fov[0], shot.fov[1], u);
    this.pose.roll = lerp(shot.roll[0], shot.roll[1], u);
    if (shot.shake > 0) addShake(this.pose, this.clock, shot.shake);
  }

  private syncSubject(): void {
    this.subject.getWorldPosition(this.origin);
    this.subject.getWorldQuaternion(this.quat);
    // YXZ order isolates yaw, so a pitched/rolled car body doesn't swing the whole intro.
    this.yaw = this.euler.setFromQuaternion(this.quat, 'YXZ').y;
  }

  private toWorld(local: Vector3, out: Vector3): void {
    out.copy(local).applyAxisAngle(UP, this.yaw).add(this.origin);
  }

  private apply(): void {
    const cam = this.camera;
    cam.position.copy(this.pose.position);
    cam.up.copy(UP);
    cam.lookAt(this.pose.lookAt);
    if (this.pose.roll !== 0) cam.rotateZ(this.pose.roll);
    if (cam.fov !== this.pose.fov) {
      cam.fov = this.pose.fov;
      cam.updateProjectionMatrix();
    }
  }
}
