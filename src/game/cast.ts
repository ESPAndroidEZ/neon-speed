import type { Scene } from 'three';
import { STAGE } from '../world/stage';
import { createCharacter, type Character, type Pose } from '../world/characters';
import type { Game } from './game';

/**
 * The people in the world: someone standing by the showroom car in menus and cutscenes, and the rivals leaning on their
 * cars at the grid (shown until GO). Built from `data/characters`; a GLB can replace a figure without changing callers.
 */
export class Cast {
  private readonly scene: Scene;
  private readonly cache = new Map<string, Character>();
  private readonly shown = new Set<Character>();
  private gridKey: unknown = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  private get(id: string): Character {
    let c = this.cache.get(id);
    if (!c) this.cache.set(id, (c = createCharacter(id)));
    return c;
  }

  private place(id: string, x: number, z: number, yaw: number, pose: Pose, y = 0): void {
    const c = this.get(id);
    c.setPose(pose);
    c.group.position.set(x, y, z);
    c.group.rotation.y = yaw;
    if (!this.shown.has(c)) {
      this.scene.add(c.group);
      this.shown.add(c);
    }
  }

  hideAll(): void {
    for (const c of this.shown) this.scene.remove(c.group);
    this.shown.clear();
    this.gridKey = null;
  }

  /** Someone beside the showroom car (menus, garage, cutscenes). */
  stage(id: string | null): void {
    this.hideAll();
    if (id) this.place(id, STAGE.x - 3.1, STAGE.z + 1.2, Math.atan2(3.1, -1.2) + 0.1, id === 'mara' ? 'phone' : 'stand');
  }

  /** Each rival at their driver door while the grid waits; pass the game each frame. */
  update(game: Game, dt: number): void {
    const grid = game.state !== 'MENU' && (game.rm.phase === 'GRID' || game.rm.phase === 'COUNTDOWN');
    if (game.state === 'MENU') {
      for (const c of this.shown) c.update(dt);
      return;
    }
    if (!grid) {
      if (this.gridKey) this.hideAll();
      return;
    }
    if (this.gridKey !== game.rm) {
      this.hideAll();
      this.gridKey = game.rm;
      game.rm.racers.forEach((r) => {
        if (r.isPlayer) return;
        const s = r.car.state;
        const sx = Math.sin(s.heading);
        const cz = Math.cos(s.heading);
        // car space: +X is left, so the driver's door side is the left flank
        this.place(r.agent?.id ?? r.id, s.position.x + cz * 2.1, s.position.z - sx * 2.1, s.heading - Math.PI / 2 + 0.25, 'lean');
      });
    }
    for (const c of this.shown) c.update(dt);
  }
}
