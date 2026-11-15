import type { JointName } from '../types/people';

/**
 * Procedural animation clips: keyframed joint rotations (radians, Euler XYZ) plus a hips height offset, eased with a
 * smoothstep between keys. Joints a key leaves out stay at rest. Conventions (src/types/people.ts space):
 * limbs hang along -Y; rotation.x < 0 swings a limb FORWARD; upper arm L rotation.z > 0 lifts it OUT to the side
 * (R: < 0); shin rotation.x > 0 bends the knee; fore arm rotation.x < 0 bends the elbow.
 */
export type Rot = readonly [number, number, number];
export interface Key { t: number; pose: Partial<Record<JointName, Rot>>; hipsY?: number }
export interface Clip { name: ClipName; duration: number; loop: boolean; keys: readonly Key[] }
export type ClipName = 'idle' | 'walk' | 'run' | 'lean' | 'armsCrossed' | 'wave' | 'cheer' | 'flagUp' | 'flagDrop' | 'phone' | 'talk';

const k = (t: number, pose: Key['pose'], hipsY = 0): Key => ({ t, pose, hipsY });
const ARMS_DOWN = { upperArmL: [0, 0, 0.08], upperArmR: [0, 0, -0.08] } as const;

export const CLIPS: Readonly<Record<ClipName, Clip>> = {
  idle: { name: 'idle', duration: 4, loop: true, keys: [
    k(0, { ...ARMS_DOWN, chest: [0, 0, 0], hips: [0, 0, 0.02], foreArmL: [-0.12, 0, 0], foreArmR: [-0.12, 0, 0] }),
    k(1, { ...ARMS_DOWN, chest: [-0.04, 0, 0], hips: [0, 0, 0.03], foreArmL: [-0.15, 0, 0], foreArmR: [-0.15, 0, 0] }, 0.005),
    k(2, { ...ARMS_DOWN, chest: [0, 0, 0], hips: [0, 0, -0.02], foreArmL: [-0.12, 0, 0], foreArmR: [-0.12, 0, 0] }),
    k(3, { ...ARMS_DOWN, chest: [-0.04, 0, 0], hips: [0, 0, -0.03], foreArmL: [-0.15, 0, 0], foreArmR: [-0.15, 0, 0] }, 0.005),
    k(4, { ...ARMS_DOWN, chest: [0, 0, 0], hips: [0, 0, 0.02], foreArmL: [-0.12, 0, 0], foreArmR: [-0.12, 0, 0] }),
  ] },
  walk: { name: 'walk', duration: 1.05, loop: true, keys: [
    k(0, { thighL: [-0.42, 0, 0], shinL: [0.1, 0, 0], thighR: [0.32, 0, 0], shinR: [0.35, 0, 0], upperArmL: [0.3, 0, 0.08], upperArmR: [-0.3, 0, -0.08], foreArmL: [-0.2, 0, 0], foreArmR: [-0.35, 0, 0] }),
    k(0.2625, { thighL: [-0.05, 0, 0], shinL: [0.05, 0, 0], thighR: [-0.05, 0, 0], shinR: [0.7, 0, 0] }, 0.03),
    k(0.525, { thighL: [0.32, 0, 0], shinL: [0.35, 0, 0], thighR: [-0.42, 0, 0], shinR: [0.1, 0, 0], upperArmL: [-0.3, 0, 0.08], upperArmR: [0.3, 0, -0.08], foreArmL: [-0.35, 0, 0], foreArmR: [-0.2, 0, 0] }),
    k(0.7875, { thighL: [-0.05, 0, 0], shinL: [0.7, 0, 0], thighR: [-0.05, 0, 0], shinR: [0.05, 0, 0] }, 0.03),
    k(1.05, { thighL: [-0.42, 0, 0], shinL: [0.1, 0, 0], thighR: [0.32, 0, 0], shinR: [0.35, 0, 0], upperArmL: [0.3, 0, 0.08], upperArmR: [-0.3, 0, -0.08], foreArmL: [-0.2, 0, 0], foreArmR: [-0.35, 0, 0] }),
  ] },
  run: { name: 'run', duration: 0.66, loop: true, keys: [
    k(0, { spine: [0.18, 0, 0], thighL: [-0.85, 0, 0], shinL: [0.3, 0, 0], thighR: [0.5, 0, 0], shinR: [1.2, 0, 0], upperArmL: [0.6, 0, 0.1], upperArmR: [-0.7, 0, -0.1], foreArmL: [-1.3, 0, 0], foreArmR: [-1.3, 0, 0] }),
    k(0.33, { spine: [0.18, 0, 0], thighL: [0.5, 0, 0], shinL: [1.2, 0, 0], thighR: [-0.85, 0, 0], shinR: [0.3, 0, 0], upperArmL: [-0.7, 0, 0.1], upperArmR: [0.6, 0, -0.1], foreArmL: [-1.3, 0, 0], foreArmR: [-1.3, 0, 0] }, 0.06),
    k(0.66, { spine: [0.18, 0, 0], thighL: [-0.85, 0, 0], shinL: [0.3, 0, 0], thighR: [0.5, 0, 0], shinR: [1.2, 0, 0], upperArmL: [0.6, 0, 0.1], upperArmR: [-0.7, 0, -0.1], foreArmL: [-1.3, 0, 0], foreArmR: [-1.3, 0, 0] }),
  ] },
  lean: { name: 'lean', duration: 5, loop: true, keys: [
    k(0, { hips: [0, 0, 0.06], spine: [-0.12, 0, 0], thighR: [-0.1, 0, -0.18], shinR: [0.1, 0, 0], upperArmL: [0.2, 0, 0.35], upperArmR: [0.2, 0, -0.35], foreArmL: [-0.3, 0, 0], foreArmR: [-0.3, 0, 0] }, -0.02),
    k(2.5, { hips: [0, 0, 0.07], spine: [-0.14, 0, 0], thighR: [-0.1, 0, -0.2], shinR: [0.12, 0, 0], upperArmL: [0.2, 0, 0.35], upperArmR: [0.2, 0, -0.35], foreArmL: [-0.3, 0, 0], foreArmR: [-0.3, 0, 0], head: [0, 0.2, 0] }, -0.02),
    k(5, { hips: [0, 0, 0.06], spine: [-0.12, 0, 0], thighR: [-0.1, 0, -0.18], shinR: [0.1, 0, 0], upperArmL: [0.2, 0, 0.35], upperArmR: [0.2, 0, -0.35], foreArmL: [-0.3, 0, 0], foreArmR: [-0.3, 0, 0] }, -0.02),
  ] },
  armsCrossed: { name: 'armsCrossed', duration: 3, loop: true, keys: [
    k(0, { upperArmL: [-0.45, 0, -0.15], upperArmR: [-0.45, 0, 0.15], foreArmL: [-1.75, -0.9, 0], foreArmR: [-1.75, 0.9, 0], chest: [0, 0, 0] }),
    k(1.5, { upperArmL: [-0.45, 0, -0.15], upperArmR: [-0.45, 0, 0.15], foreArmL: [-1.75, -0.9, 0], foreArmR: [-1.75, 0.9, 0], chest: [-0.04, 0, 0] }, 0.004),
    k(3, { upperArmL: [-0.45, 0, -0.15], upperArmR: [-0.45, 0, 0.15], foreArmL: [-1.75, -0.9, 0], foreArmR: [-1.75, 0.9, 0], chest: [0, 0, 0] }),
  ] },
  wave: { name: 'wave', duration: 1.2, loop: true, keys: [
    k(0, { upperArmR: [0, 0, -2.5], foreArmR: [0, 0, -0.4], upperArmL: [0, 0, 0.08] }),
    k(0.3, { upperArmR: [0, 0, -2.6], foreArmR: [0, 0, 0.35], upperArmL: [0, 0, 0.08] }),
    k(0.6, { upperArmR: [0, 0, -2.5], foreArmR: [0, 0, -0.4], upperArmL: [0, 0, 0.08] }),
    k(0.9, { upperArmR: [0, 0, -2.6], foreArmR: [0, 0, 0.35], upperArmL: [0, 0, 0.08] }),
    k(1.2, { upperArmR: [0, 0, -2.5], foreArmR: [0, 0, -0.4], upperArmL: [0, 0, 0.08] }),
  ] },
  cheer: { name: 'cheer', duration: 0.8, loop: true, keys: [
    k(0, { upperArmL: [0, 0, 2.7], upperArmR: [0, 0, -2.7], foreArmL: [0, 0, 0.3], foreArmR: [0, 0, -0.3], shinL: [0.25, 0, 0], shinR: [0.25, 0, 0], thighL: [-0.2, 0, 0], thighR: [-0.2, 0, 0] }, -0.04),
    k(0.4, { upperArmL: [0, 0, 2.95], upperArmR: [0, 0, -2.95], foreArmL: [0, 0, -0.1], foreArmR: [0, 0, 0.1] }, 0.08),
    k(0.8, { upperArmL: [0, 0, 2.7], upperArmR: [0, 0, -2.7], foreArmL: [0, 0, 0.3], foreArmR: [0, 0, -0.3], shinL: [0.25, 0, 0], shinR: [0.25, 0, 0], thighL: [-0.2, 0, 0], thighR: [-0.2, 0, 0] }, -0.04),
  ] },
  flagUp: { name: 'flagUp', duration: 2, loop: true, keys: [
    k(0, { upperArmL: [0, 0, 2.95], upperArmR: [0, 0, -2.95], chest: [0.05, 0, 0] }),
    k(1, { upperArmL: [0, 0, 3.0], upperArmR: [0, 0, -3.0], chest: [0.07, 0, 0] }, 0.01),
    k(2, { upperArmL: [0, 0, 2.95], upperArmR: [0, 0, -2.95], chest: [0.05, 0, 0] }),
  ] },
  flagDrop: { name: 'flagDrop', duration: 0.7, loop: false, keys: [
    k(0, { upperArmL: [0, 0, 3.0], upperArmR: [0, 0, -3.0], chest: [0.07, 0, 0] }),
    k(0.22, { upperArmL: [-2.2, 0, 0.4], upperArmR: [-2.2, 0, -0.4], chest: [-0.35, 0, 0], spine: [-0.15, 0, 0], thighL: [-0.35, 0, 0], shinL: [0.4, 0, 0] }, -0.06),
    k(0.7, { upperArmL: [-0.7, 0, 0.3], upperArmR: [-0.7, 0, -0.3], chest: [-0.1, 0, 0], thighL: [-0.2, 0, 0], shinL: [0.25, 0, 0] }, -0.02),
  ] },
  phone: { name: 'phone', duration: 2, loop: true, keys: [
    k(0, { upperArmR: [-0.45, 0, 0.05], foreArmR: [-1.55, 0.3, 0], upperArmL: [-0.35, 0, -0.05], foreArmL: [-1.45, -0.3, 0], head: [0.35, 0, 0], neck: [0.1, 0, 0] }),
    k(1, { upperArmR: [-0.47, 0, 0.05], foreArmR: [-1.6, 0.3, 0], upperArmL: [-0.35, 0, -0.05], foreArmL: [-1.45, -0.3, 0], head: [0.38, 0.05, 0], neck: [0.1, 0, 0], handR: [0.15, 0, 0] }),
    k(2, { upperArmR: [-0.45, 0, 0.05], foreArmR: [-1.55, 0.3, 0], upperArmL: [-0.35, 0, -0.05], foreArmL: [-1.45, -0.3, 0], head: [0.35, 0, 0], neck: [0.1, 0, 0] }),
  ] },
  talk: { name: 'talk', duration: 2.4, loop: true, keys: [
    k(0, { upperArmL: [-0.25, 0, 0.15], foreArmL: [-0.9, 0, 0], upperArmR: [0, 0, -0.08], foreArmR: [-0.2, 0, 0], head: [0, 0.1, 0] }),
    k(0.8, { upperArmL: [-0.4, 0, 0.3], foreArmL: [-1.2, 0.4, 0], upperArmR: [-0.3, 0, -0.2], foreArmR: [-0.9, 0, 0], head: [0.06, -0.08, 0] }),
    k(1.6, { upperArmL: [-0.2, 0, 0.1], foreArmL: [-0.7, 0, 0], upperArmR: [-0.4, 0, -0.3], foreArmR: [-1.2, -0.4, 0], head: [-0.04, 0.12, 0.05] }),
    k(2.4, { upperArmL: [-0.25, 0, 0.15], foreArmL: [-0.9, 0, 0], upperArmR: [0, 0, -0.08], foreArmR: [-0.2, 0, 0], head: [0, 0.1, 0] }),
  ] },
};
