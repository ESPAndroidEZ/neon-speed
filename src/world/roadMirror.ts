import { PlaneGeometry, type MeshStandardMaterial, type Scene } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { NO_REFLECT } from './layers';

/**
 * Planar mirror under the road for real wet-street reflections. Expensive (renders the scene again), so it only
 * exists after the first time it is needed (High tier + rain) and is switched off otherwise.
 */
export class RoadMirror {
  private mirror: Reflector | null = null;
  private on = false;
  private readonly scene: Scene;
  private readonly road: MeshStandardMaterial;

  constructor(scene: Scene, road: MeshStandardMaterial) {
    this.scene = scene;
    this.road = road;
  }

  setActive(active: boolean): void {
    if (active === this.on) return;
    this.on = active;
    if (active && !this.mirror) {
      const m = new Reflector(new PlaneGeometry(1000, 1000), { textureWidth: 512, textureHeight: 512, color: 0x7f8fb8, clipBias: 0.003 });
      m.rotation.x = -Math.PI / 2;
      const draw = m.onBeforeRender; // the Reflector takes the main camera's layers: hide NO_REFLECT (people, wheels) for its pass
      m.onBeforeRender = function (r, s, cam, ...rest) { cam.layers.disable(NO_REFLECT); draw.call(this, r, s, cam, ...rest); cam.layers.enable(NO_REFLECT); };
      m.position.set(100, 0.012, 150); // under the road (0.02), above the ground plane
      this.scene.add(m);
      this.mirror = m;
    }
    if (this.mirror) this.mirror.visible = active;
    // the road lets the reflection through while the mirror is on
    this.road.transparent = active;
    this.road.opacity = active ? 0.8 : 1;
    this.road.needsUpdate = true;
  }
}
