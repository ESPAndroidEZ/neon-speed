import type { PerspectiveCamera } from 'three';

/** Slow orbit around the car for the menu and garage. */
export class ShowroomCam {
  private angle = 0;
  /** Metres to slide the car toward the right of the screen (garage keeps the left for its panel). */
  shift = 0;

  update(cam: PerspectiveCamera, dt: number, x: number, z: number): void {
    this.angle += dt * 0.35;
    const d = 9.4 * Math.max(1, 1.5 / cam.aspect); // pull back on narrow (portrait) screens
    cam.position.set(x + Math.sin(this.angle) * d, 1.8 + d * 0.05, z + Math.cos(this.angle) * d);
    cam.lookAt(x - Math.cos(this.angle) * this.shift, -0.25, z + Math.sin(this.angle) * this.shift); // aims low so the car sits in the upper half, above the menu panels
    if (cam.fov !== 45) {
      cam.fov = 45;
      cam.updateProjectionMatrix();
    }
  }
}
