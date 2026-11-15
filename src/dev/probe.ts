import { Vector3 } from 'three';
import type { Game } from '../game/game';

/**
 * Dev `?probe`: `window.__rbProbe()` projects the player car and points on the road ahead to screen pixels, for
 * scripts/viewport-check.mjs (car in the lower centre, road ahead reaching up the screen at every aspect ratio).
 */
export function installProbe(game: Game): void {
  const eng = (game as unknown as { d: { engine: { camera: import('three').PerspectiveCamera; renderer: import('three').WebGLRenderer } } }).d.engine;
  const v = new Vector3();
  const project = (x: number, y: number, z: number): [number, number] => {
    const el = eng.renderer.domElement.getBoundingClientRect();
    v.set(x, y, z).project(eng.camera);
    return [Math.round(((v.x + 1) / 2) * el.width), Math.round(((1 - v.y) / 2) * el.height)];
  };
  (window as unknown as Record<string, unknown>).__rbProbe = () => {
    const c = game.player.car.state;
    const sx = Math.sin(c.heading), cz = Math.cos(c.heading), p = c.position;
    return {
      state: game.state,
      fov: eng.camera.fov,
      aspect: eng.camera.aspect,
      car: project(p.x, p.y + 0.6, p.z),
      ahead25: project(p.x + sx * 25, p.y, p.z + cz * 25),
      ahead60: project(p.x + sx * 60, p.y, p.z + cz * 60),
    };
  };
}
