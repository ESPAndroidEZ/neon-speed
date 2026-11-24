import { Vector3 } from 'three';
import { TAU, easeInOutCubic, easeInOutSine, type Ease } from '../core/math';

export type Pair = readonly [number, number];

/** Circular orbit around the subject. `angle` 0 = in front of the nose; increasing angle swings toward the car's left. */
export interface OrbitPath {
  kind: 'orbit';
  radius: Pair;
  height: Pair;
  /** Radians. A span of TAU is a full 360. */
  angle: Pair;
}

/** Catmull-Rom spline through points in car-local space (+Z nose, +X left). */
export interface SplinePath {
  kind: 'spline';
  points: Vector3[];
}

export type ShotPath = OrbitPath | SplinePath;

/** One take. Everything is car-local, so the intro works wherever (and however) the car is parked. */
export interface CameraShot {
  name: string;
  /** Seconds. Must be > 0. */
  duration: number;
  path: ShotPath;
  /** Look-at point (car-local), lerped from first to second over the shot. */
  focus: readonly [Vector3, Vector3];
  /** Degrees. */
  fov: Pair;
  /** Dutch-angle roll in radians. */
  roll: Pair;
  ease: Ease;
  /** Handheld shake amplitude in metres (0 = locked off). */
  shake: number;
}

const v = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

/**
 * The Most Wanted-style opener: four hard-cut takes. The CinematicCam then whips
 * from the last take into the live chase view.
 */
export function createIntroShots(): CameraShot[] {
  return [
    {
      // Hugging the tarmac, swinging across the nose from the right headlight to the left.
      name: 'front-low-sweep',
      duration: 2.2,
      path: { kind: 'orbit', radius: [4.6, 3.8], height: [0.32, 0.5], angle: [-0.95, 0.85] },
      focus: [v(0, 0.5, 1.5), v(0, 0.55, 0.9)],
      fov: [54, 46],
      roll: [0.05, -0.04],
      ease: easeInOutSine,
      shake: 0.025,
    },
    {
      // Tracking along the left flank, eyes on the wheels, ending behind the car.
      name: 'wheel-flyby',
      duration: 2.0,
      path: {
        kind: 'spline',
        points: [v(2.7, 0.35, 3.0), v(2.2, 0.4, 1.4), v(1.95, 0.5, 0), v(2.1, 0.55, -1.6), v(2.7, 0.7, -3.1)],
      },
      focus: [v(0.9, 0.45, 1.3), v(0.9, 0.5, -1.3)],
      fov: [40, 34],
      roll: [0.03, -0.03],
      ease: easeInOutSine,
      shake: 0.02,
    },
    {
      // The hero 360: slow-fast-slow, drifting up and in.
      name: 'orbit-360',
      duration: 4.2,
      path: { kind: 'orbit', radius: [7.5, 5.8], height: [1.0, 2.2], angle: [2.4, 2.4 + TAU] },
      focus: [v(0, 0.7, 0), v(0, 0.7, 0)],
      fov: [45, 40],
      roll: [0, 0],
      ease: easeInOutSine, // cubic peaks at ~255 deg/s on this orbit; sine keeps it near 135
      shake: 0.03,
    },
    {
      // Rising from behind the bumper; focus slides up the road so the track is revealed.
      name: 'rear-crane-reveal',
      duration: 2.4,
      path: {
        kind: 'spline',
        points: [v(-1.6, 0.28, -3.0), v(-0.9, 0.7, -4.1), v(-0.2, 1.7, -5.3), v(0, 2.6, -6.6)],
      },
      focus: [v(0, 0.7, -0.5), v(0, 1.0, 8)],
      fov: [46, 60],
      roll: [-0.05, 0],
      ease: easeInOutCubic,
      shake: 0.015,
    },
  ];
}

/** The short fly-by before a race (about 3.4 s, any key skips it): a low sweep across the nose, then the crane up behind the car into the chase view. */
export function createFlybyShots(): CameraShot[] {
  const all = createIntroShots();
  return [{ ...all[0], duration: 1.7 }, { ...all[3], duration: 1.7 }];
}
