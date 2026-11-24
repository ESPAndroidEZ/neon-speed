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
import { CityRaceSpots, RING } from './cityRaces';
import { RoamWhere } from '../ui/roamWhere';
import { placeTokens, TokenWatch, TOKEN_COUNT } from '../core/tokens';
import { tokenMesh } from '../world/open/tokenView';

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
  /** After a teleport (enter, fast travel, respawn): the story places wait until the car has left their rings. */
  onPlace: (x: number, z: number) => void = () => {};
  /** Neon tokens (owner playtest: a point to drive around). `onToken(id, count)` saves and returns the cash paid (0 = none). */
  tokens: TokenWatch;
  onToken: (id: number, count: number) => number = () => 0;
  private tokenView: ReturnType<typeof tokenMesh>;
  private readonly group: Group;
  private clock = 0;
  private meet: MeetWatch | null = null;
  /** Where the car meet is (null when the harbour has no spot for it). */
  readonly meetSpot: { x: number; z: number; r: number } | null;
  private lastX = 0;
  private lastZ = 0;
  /** City race start rings (W5.5). */
  readonly races: CityRaceSpots;
  /** Street and district line (task 066). */
  private readonly where: RoamWhere;

  constructor(g: RoadGraph, group: Group, hud: Hud, contact: RoamContact, carName: () => string) {
    this.hud = hud;
    this.group = group;
    this.tokens = new TokenWatch(placeTokens(g));
    this.tokenView = tokenMesh(this.tokens.tokens, this.tokens.got);
    group.add(this.tokenView.mesh);
    this.carName = carName;
    this.traps = placeSpeedTraps(g);
    const cams = trapMesh(this.traps);
    this.zones = placeDriftZones(g);
    this.run = new DriftRun(this.zones);
    const rings = zoneMesh(this.zones);
    this.races = new CityRaceSpots(g);
    this.where = new RoamWhere(g, contact.roads);
    this.disposers.push(() => this.where.dispose());
    const starts = zoneMesh(this.races.races.map((r) => ({ x: r.x, z: r.z, r: RING })), 0xffb020);
    group.add(cams, rings, starts);
    const meet = placeCarMeet(g, this.zones);
    this.meetSpot = meet;
    if (meet) {
      const v = meetGroup(meet);
      group.add(v.group);
      this.disposers.push(v.dispose);
      this.meet = new MeetWatch(meet);
      contact.parked = Float32Array.from(meet.slots.flatMap((s) => [s.x, s.z, s.h]));
    }
    this.disposers.push(() => { for (const m of [cams, rings, starts, this.tokenView.mesh]) { m.geometry.dispose(); (m.material as { dispose(): void }).dispose(); } });
  }

  /** Tokens collected in earlier drives (ids from the save). */
  restoreTokens(ids: readonly number[]): void {
    this.group.remove(this.tokenView.mesh);
    this.tokenView.mesh.dispose();
    this.tokens = new TokenWatch(this.tokens.tokens, ids);
    this.tokenView = tokenMesh(this.tokens.tokens, this.tokens.got);
    this.group.add(this.tokenView.mesh);
  }

  /** After a teleport (enter, fast travel, respawn): the jump is not a pass through anything. */
  place(x: number, z: number): void {
    this.lastX = x;
    this.lastZ = z;
    this.run.cancel();
    this.races.place(x, z);
    this.onPlace(x, z);
    this.where.reset();
  }

  step(car: CarController, dt: number): void {
    const x = car.state.position.x, z = car.state.position.z;
    for (let i = 0; i < this.traps.length; i++) if (crossed(this.traps[i], this.lastX, this.lastZ, x, z)) this.caught(i, Math.abs(car.state.speed) * 3.6);
    this.lastX = x;
    this.lastZ = z;
    this.races.step(x, z, car.state.speed);
    this.clock += dt;
    this.tokenView.pulse(this.clock);
    const tk = this.tokens.step(x, z);
    if (tk >= 0) {
      this.tokenView.hide(tk);
      const cash = this.onToken(tk, this.tokens.count);
      this.hud.popUp(cash > 0 ? t('roam.tokenPay', { n: this.tokens.count, all: TOKEN_COUNT, cash: cash.toLocaleString() }) : t('roam.token', { n: this.tokens.count, all: TOKEN_COUNT }), cash > 0 ? '#ffd27d' : '#18d8ff');
    }
    this.where.update(dt, x, z);
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
