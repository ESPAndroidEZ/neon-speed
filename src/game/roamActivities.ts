import type { Group } from 'three';
import type { RoadGraph } from '../types/world';
import type { CarController } from '../physics/carController';
import type { Hud } from '../ui/hud';
import { crossed, placeSpeedTraps, type SpeedTrap } from '../core/speedTraps';
import { trapMesh } from '../world/open/trapView';
import { speedText } from './speedUnit';
import { t } from '../i18n';

/**
 * Free Drive activities (W5.4): speed cameras (and the drift zones and car meet that follow). Built with the city,
 * stepped from freeRoam's fixed step; records live in memory until the `roam` save (W5.5). No allocation per step.
 */
export class RoamActivities {
  readonly traps: SpeedTrap[];
  /** Best km/h per camera id. */
  readonly trapBest = new Map<number, number>();
  private readonly hud: Hud;
  private readonly disposers: (() => void)[] = [];
  private lastX = 0;
  private lastZ = 0;

  constructor(g: RoadGraph, group: Group, hud: Hud) {
    this.hud = hud;
    this.traps = placeSpeedTraps(g);
    const cams = trapMesh(this.traps);
    group.add(cams);
    this.disposers.push(() => { cams.geometry.dispose(); (cams.material as { dispose(): void }).dispose(); });
  }

  /** After a teleport (enter, fast travel, respawn): the jump is not a pass through anything. */
  place(x: number, z: number): void {
    this.lastX = x;
    this.lastZ = z;
  }

  step(car: CarController): void {
    const x = car.state.position.x, z = car.state.position.z;
    for (let i = 0; i < this.traps.length; i++) if (crossed(this.traps[i], this.lastX, this.lastZ, x, z)) this.caught(i, Math.abs(car.state.speed) * 3.6);
    this.lastX = x;
    this.lastZ = z;
  }

  dispose(): void {
    for (const f of this.disposers) f();
  }

  private caught(id: number, kmh: number): void {
    const best = this.trapBest.get(id) ?? 0;
    if (kmh > best) this.trapBest.set(id, kmh);
    this.hud.popUp(t(kmh > best && best > 0 ? 'roam.trapBest' : 'roam.trap', { v: speedText(kmh) }), kmh > best ? '#ffd27d' : '#8fd8ff');
  }
}
