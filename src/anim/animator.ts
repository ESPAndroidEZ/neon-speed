import { CLIPS, type Clip, type ClipName } from './clips';
import { JOINTS, REST, type JointName, type PersonRig } from '../types/people';

const N = JOINTS.length;
const IDX = Object.fromEntries(JOINTS.map((j, i) => [j, i])) as Record<JointName, number>;
const ease = (x: number): number => x * x * (3 - 2 * x);

/**
 * Sample a clip at time t into `out` (3 floats per joint in JOINTS order, then hips height offset at out[N * 3]).
 * Pure and allocation free; loops wrap, one-shots hold their last key. NaN-free for any finite t.
 */
export function sampleClip(clip: Clip, t: number, out: Float32Array): void {
  out.fill(0);
  const d = clip.duration;
  let tt = Number.isFinite(t) ? t : 0;
  tt = clip.loop ? ((tt % d) + d) % d : Math.min(Math.max(tt, 0), d);
  const ks = clip.keys;
  let i = 0;
  while (i < ks.length - 2 && ks[i + 1].t <= tt) i++;
  const a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)];
  const span = b.t - a.t;
  const x = span > 1e-6 ? ease(Math.min(1, Math.max(0, (tt - a.t) / span))) : 0;
  for (const j of JOINTS) {
    const ra = a.pose[j], rb = b.pose[j];
    if (!ra && !rb) continue;
    const o = IDX[j] * 3;
    for (let c = 0; c < 3; c++) out[o + c] = (ra?.[c] ?? 0) * (1 - x) + (rb?.[c] ?? 0) * x;
  }
  out[N * 3] = (a.hipsY ?? 0) * (1 - x) + (b.hipsY ?? 0) * x;
}

/** out = a * (1 - w) + b * w (same layout as sampleClip). */
export function blendPose(a: Float32Array, b: Float32Array, w: number, out: Float32Array): void {
  const k = Number.isFinite(w) ? Math.min(1, Math.max(0, w)) : 1;
  for (let i = 0; i < out.length; i++) out[i] = a[i] * (1 - k) + b[i] * k;
}

/**
 * Plays clips on one PersonRig with cross-fades, an optional head look-at (clamped yaw/pitch, smoothed) and a talk
 * intensity that scales gestures. `phase` offsets the clock (crowds: random per person, so they do not move in sync).
 */
export class Animator {
  readonly rig: PersonRig;
  phase = 0;
  /** 0..1: how animated the talk clip is (dialogue drives it). */
  talk = 1;
  private clip: Clip = CLIPS.idle;
  private prev: Clip | null = null;
  private t = 0;
  private prevT = 0;
  private fade = 0;
  private fadeLen = 0.3;
  private readonly a = new Float32Array(N * 3 + 1);
  private readonly b = new Float32Array(N * 3 + 1);
  private readonly pose = new Float32Array(N * 3 + 1);
  private yaw = 0;
  private pitch = 0;

  constructor(rig: PersonRig, phase = 0) {
    this.rig = rig;
    this.phase = phase;
  }

  get current(): ClipName { return this.clip.name; }
  /** One-shot clip finished (holds its last key). */
  get done(): boolean { return !this.clip.loop && this.t >= this.clip.duration; }

  play(name: ClipName, fade = 0.3): void {
    if (name === this.clip.name && this.clip.loop) return;
    this.prev = this.clip;
    this.prevT = this.t;
    this.clip = CLIPS[name];
    this.t = 0;
    this.fade = 0;
    this.fadeLen = Math.max(0.01, fade);
  }

  /** Advance and pose the rig. `look` = local yaw/pitch toward a target (radians) or null; clamped to +-1.1 / +-0.45. */
  update(dt: number, lookYaw: number | null = null, lookPitch = 0): void {
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    this.t += step;
    this.prevT += step;
    this.fade = Math.min(1, this.fade + step / this.fadeLen);
    sampleClip(this.clip, this.t + (this.clip.loop ? this.phase : 0), this.b);
    if (this.prev && this.fade < 1) {
      sampleClip(this.prev, this.prevT + (this.prev.loop ? this.phase : 0), this.a);
      blendPose(this.a, this.b, this.fade, this.pose);
    } else this.pose.set(this.b);
    if (this.clip.name === 'talk' && this.talk < 1) for (let i = 15; i < 33; i++) this.pose[i] *= Math.max(0, this.talk); // arms only
    const ty = lookYaw === null ? 0 : Math.max(-1.1, Math.min(1.1, lookYaw));
    const tp = lookYaw === null ? 0 : Math.max(-0.45, Math.min(0.45, lookPitch));
    const k = Math.min(1, step * 4);
    this.yaw += (ty - this.yaw) * k;
    this.pitch += (tp - this.pitch) * k;
    this.apply();
  }

  private apply(): void {
    const j = this.rig.joints, p = this.pose;
    for (let i = 0; i < N; i++) {
      const name = JOINTS[i];
      j[name].rotation.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    }
    const h = IDX.head * 3, n = IDX.neck * 3;
    j.head.rotation.set(p[h] + this.pitch * 0.7, p[h + 1] + this.yaw * 0.7, p[h + 2]);
    j.neck.rotation.set(p[n] + this.pitch * 0.3, p[n + 1] + this.yaw * 0.3, p[n + 2]);
    j.hips.position.y = REST.hips[1] + p[N * 3];
  }
}
