import type { PerspectiveCamera } from 'three';

/** Slow orbit around the car for the menu and garage. */
export class ShowroomCam {
  private angle = 0;

  update(cam: PerspectiveCamera, dt: number, x: number, z: number): void {
    this.angle += dt * 0.35;
    cam.position.set(x + Math.sin(this.angle) * 8.2, 1.8, z + Math.cos(this.angle) * 8.2);
    cam.lookAt(x, -0.25, z); // aims low so the car sits in the upper half, above the menu panels
    if (cam.fov !== 45) {
      cam.fov = 45;
      cam.updateProjectionMatrix();
    }
  }
}
