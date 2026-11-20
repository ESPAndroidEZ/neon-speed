import type { Group } from 'three';
import type { RoadGraph } from '../types/world';
import type { CarController } from '../physics/carController';
import type { Hud } from '../ui/hud';
import { crossed, placeSpeedTraps, type SpeedTrap } from '../core/speedTraps';
import { trapMesh } from '../world/open/trapView';
import { DriftRun, placeDriftZones, type DriftZone } from '../core/driftZones';
import { zoneMesh } from '../world/open/zoneView';
import { MeetWatch, placeCarMeet } from '../core/carMeet';
import { meetGroup } from '../world/open/meetView';
import type { RoamContact } from '../physics/roamContact';
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
  readonly zones: DriftZone[];
  /** Best drift score per zone id. */
  readonly zoneBest = new Map<number, number>();
  private readonly run: DriftRun;
  private readonly hud: Hud;
  private readonly disposers: (() => void)[] = [];
  private readonly carName: () => string;
  /** Set by RoamProgress: a new best (key `trap:<id>` / `zone:<id>`) and a first visit (place id) are saved. */
  onRecord: (key: string, value: number) => void = () => {};
  onVisit: (id: string) => void = () => {};
  private meet: MeetWatch | null = null;
  /** Where the car meet is (null when the harbour has no spot for it). */
  readonly meetSpot: { x: number; z: number; r: number } | null;
  private lastX = 0;
  private lastZ = 0;

  constructor(g: RoadGraph, group: Group, hud: Hud, contact: RoamContact, carName: () => string) {
    this.hud = hud;
    this.carName = carName;
    this.traps = placeSpeedTraps(g);
    const cams = trapMesh(this.traps);
    this.zones = placeDriftZones(g);
    this.run = new DriftRun(this.zones);
    const rings = zoneMesh(this.zones);
    group.add(cams, rings);
    const meet = placeCarMeet(g, this.zones);
    this.meetSpot = meet;
    if (meet) {
      const v = meetGroup(meet);
      group.add(v.group);
      this.disposers.push(v.dispose);
      this.meet = new MeetWatch(meet);
      contact.parked = Float32Array.from(meet.slots.flatMap((s) => [s.x, s.z, s.h]));
    }
    this.disposers.push(() => { for (const m of [cams, rings]) { m.geometry.dispose(); (m.material as { dispose(): void }).dispose(); } });
  }

  /** After a teleport (enter, fast travel, respawn): the jump is not a pass through anything. */
  place(x: number, z: number): void {
    this.lastX = x;
    this.lastZ = z;
    this.run.cancel();
  }

  step(car: CarController, dt: number): void {
    const x = car.state.position.x, z = car.state.position.z;
    for (let i = 0; i < this.traps.length; i++) if (crossed(this.traps[i], this.lastX, this.lastZ, x, z)) this.caught(i, Math.abs(car.state.speed) * 3.6);
    this.lastX = x;
    this.lastZ = z;
    const ev = this.run.update(x, z, car.drift.bank + car.drift.chain);
    if (ev === 1) this.hud.popUp(t('roam.zoneIn'), '#18d8ff');
    else if (ev === 2) this.zoneDone(this.run.score);
    if (this.meet?.update(x, z, car.state.speed, dt)) { this.hud.popUp(t('roam.meet', { car: this.carName() }), '#ff2a9d'); this.onVisit('meet'); }
  }

  /** A zone run just ended: its score, and a new best for that zone when it is one. */
  private zoneDone(score: number): void {
    const id = this.run.last;
    const best = this.zoneBest.get(id) ?? 0;
    if (score > best) { this.zoneBest.set(id, score); this.onRecord(`zone:${id}`, score); }
    this.hud.popUp(t(score > best && best > 0 ? 'roam.zoneBest' : 'roam.zoneOut', { n: score.toLocaleString() }), score > best ? '#ffd27d' : '#8fd8ff');
  }

  dispose(): void {
    for (const f of this.disposers) f();
  }

  private caught(id: number, kmh: number): void {
    const best = this.trapBest.get(id) ?? 0;
    if (kmh > best) { this.trapBest.set(id, kmh); this.onRecord(`trap:${id}`, kmh); }
    this.hud.popUp(t(kmh > best && best > 0 ? 'roam.trapBest' : 'roam.trap', { v: speedText(kmh) }), kmh > best ? '#ffd27d' : '#8fd8ff');
  }
}
