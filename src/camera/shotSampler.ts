import { CatmullRomCurve3, Vector3 } from 'three';
import { lerp } from '../core/math';
import type { CameraPose } from '../types/game';
import type { CameraShot, ShotPath } from './shots';

/** Working pose: a CameraPose plus roll (radians). */
export interface Pose extends CameraPose {
  roll: number;
}

export const makePose = (): Pose => ({ position: new Vector3(), lookAt: new Vector3(), fov: 60, roll: 0 });

export const copyPose = (src: Pose, dst: Pose): void => {
  dst.position.copy(src.position);
  dst.lookAt.copy(src.lookAt);
  dst.fov = src.fov;
  dst.roll = src.roll;
};

/** One reusable curve per spline shot (undefined for orbit shots), indexed like `shots`. */
export function buildCurves(shots: readonly CameraShot[]): (CatmullRomCurve3 | undefined)[] {
  return shots.map((s) =>
    s.path.kind === 'spline' ? new CatmullRomCurve3(s.path.points, false, 'centripetal') : undefined,
  );
}

/** Car-local camera position for progress u (0..1), written into `out`. */
export function samplePath(path: ShotPath, curve: CatmullRomCurve3 | undefined, u: number, out: Vector3): Vector3 {
  if (path.kind === 'orbit') {
    const a = lerp(path.angle[0], path.angle[1], u);
    const r = lerp(path.radius[0], path.radius[1], u);
    return out.set(Math.sin(a) * r, lerp(path.height[0], path.height[1], u), Math.cos(a) * r);
  }
  return curve ? curve.getPointAt(u, out) : out.copy(path.points[0]);
}

/** Cheap handheld feel: incommensurate sines, no allocation. Offsets `pose` in place. */
export function addShake(pose: Pose, clock: number, amp: number): void {
  const c = clock;
  pose.position.x += Math.sin(c * 9.1) * Math.sin(c * 3.3 + 0.4) * amp;
  pose.position.y += Math.sin(c * 11.7 + 1.9) * Math.sin(c * 4.1) * amp;
  pose.position.z += Math.sin(c * 8.3 + 0.8) * Math.sin(c * 2.9 + 2.1) * amp;
  pose.roll += Math.sin(c * 7.3 + 0.7) * amp * 0.5;
}
