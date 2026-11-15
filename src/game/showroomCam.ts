import type { PerspectiveCamera } from 'three';
import { GARAGE_CONFIG, type GarageLayout } from '../ui/garageConfig';

/** Slow orbit around the car for the menu and garage. The car's screen position comes from ui/garageConfig (NDC, any aspect). */
export class ShowroomCam {
  private angle = 0;
  private shifted = false;
  /** Which screen layout is up; the car is moved on screen to GARAGE_CONFIG[layout] with a projection shift. */
  layout: GarageLayout = 'main';
  /** Dev (`?showcar`): hold the camera at this angle (radians) and distance instead of orbiting. */
  fixedAngle: number | null = null;
  distance: number = GARAGE_CONFIG.distance;

  update(cam: PerspectiveCamera, dt: number, x: number, z: number): void {
    const c = GARAGE_CONFIG;
    if (this.fixedAngle !== null) this.angle = this.fixedAngle;
    else this.angle += dt * c.orbitSpeed;
    const d = this.distance * Math.max(1, c.narrowAspect / cam.aspect); // pull back on narrow (portrait) screens
    cam.position.set(x + Math.sin(this.angle) * d, c.height + d * c.heightPerMetre, z + Math.cos(this.angle) * d);
    cam.lookAt(x, c.lookAtY, z);
    if (cam.fov !== c.fov) cam.fov = c.fov;
    const at = c[this.layout];
    // Slide the image, not the camera: a view offset of the full frame by (at.x, at.y) in NDC.
    const fw = 1000 * cam.aspect;
    cam.setViewOffset(fw, 1000, (-at.x * fw) / 2, (at.y * 1000) / 2, fw, 1000);
    this.shifted = true;
    cam.updateProjectionMatrix();
  }

  /** Back to the plain projection once the menu is gone (chase and cinematic cameras expect no offset). */
  release(cam: PerspectiveCamera): void {
    if (!this.shifted) return;
    this.shifted = false;
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
}
