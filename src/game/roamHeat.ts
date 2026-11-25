import type { Group } from 'three';
import type { RoadGraph } from '../types/world';
import type { CarController } from '../physics/carController';
import type { RoamContact } from '../physics/roamContact';
import type { Hud } from '../ui/hud';
import { RoamPolice } from '../physics/roamPolice';
import { copsFor, ESCALATE_AFTER, escapeCash, escapeRep, fineFor, Heat } from '../core/police';
import { policeView, type PoliceView } from '../world/open/policeView';
import { heatHud, type HeatHud } from '../ui/heatHud';
import { createRoadHit } from '../world/roads/roadIndex';
import { t } from '../i18n';

const CRASH = 7; // m/s: a crash into a traffic car this hard calls the police

/**
 * Free Drive police (docs/nfs-vision.md section 2): a speed camera flash at 200 km/h or a hard crash into traffic gives
 * a star; up to three cars chase you along the streets. Stay close and slow and you are BUSTED (a fine, and you start
 * again on the road); get away and it is an ESCAPE (cash and REP). One per city, stepped from RoamActivities.
 */
export class RoamHeat {
  readonly heat = new Heat();
  readonly police: RoamPolice;
  private readonly view: PoliceView;
  private readonly ui: HeatHud;
  private readonly hud: Hud;
  private readonly contact: RoamContact;
  private readonly io: { cash(): number; pay(n: number): void; rep(n: number): void };
  private readonly hit = createRoadHit();
  private readonly p = { x: 0, z: 0 };
  private px = 0; private pz = 0;
  private clock = 0;
  private cool = 0;
  private chase = 0; // seconds since the last star: a long chase brings another

  constructor(g: RoadGraph, group: Group, hud: Hud, contact: RoamContact, io: { cash(): number; pay(n: number): void; rep(n: number): void }) {
    this.hud = hud; this.contact = contact; this.io = io;
    this.police = new RoamPolice(g, contact.roads);
    this.view = policeView();
    this.ui = heatHud();
    group.add(this.view.group);
    contact.police = this.police.boxes;
    contact.onCop = (i) => this.police.bump(i);
  }

  /** A star (a camera flash at speed, a hard crash). */
  wanted(): void {
    if (this.cool > 0) return;
    this.cool = 6;
    if (!this.heat.raise()) return;
    this.police.top = 42 + 5 * this.heat.level; this.chase = 0;
    this.police.send(copsFor(this.heat.level), this.px, this.pz);
    this.hud.popUp(t(this.heat.level === 1 ? 'heat.wanted' : 'heat.up', { n: this.heat.level }), '#ff4d6d');
  }

  step(car: CarController, dt: number): void {
    const st = car.state;
    this.px = st.position.x; this.pz = st.position.z;
    this.clock += dt;
    if (this.cool > 0) this.cool -= dt;
    if (this.contact.hitCar >= 0 && this.contact.impact > CRASH) this.wanted();
    if (this.heat.level === 0) { if (this.police.count) this.stop(); return; }
    const speed = Math.abs(st.speed), level = this.heat.level;
    if (level < 3 && (this.chase += dt) > ESCALATE_AFTER) { this.cool = 0; this.wanted(); }
    this.police.step(dt, this.px, this.pz, speed);
    const ev = this.heat.step(dt, speed, this.police.nearest(this.px, this.pz));
    this.ui.update(this.heat.level, this.heat.bust);
    this.view.update(this.police, this.clock);
    if (ev === 'busted') this.busted(car);
    else if (ev === 'escaped') {
      this.io.pay(escapeCash(level)); this.io.rep(escapeRep(level));
      this.hud.popUp(t('heat.escaped', { cash: escapeCash(level).toLocaleString(), rep: escapeRep(level) }), '#7dff9a');
      this.stop();
    }
  }

  /** The car was put somewhere else (respawn, fast travel): a wanted level stays, the cops are brought out again around the new spot. */
  relocate(x: number, z: number): void {
    this.px = x; this.pz = z;
    if (this.heat.level === 0) return;
    this.police.stop(); this.police.top = 42 + 5 * this.heat.level;
    this.police.send(copsFor(this.heat.level), x, z);
  }

  /** Leaving Free Drive ends the chase. */
  leave(): void { this.heat.reset(); this.cool = 0; this.stop(); }

  dispose(): void { this.ui.dispose(); this.view.dispose(); }

  private stop(): void { this.police.stop(); this.ui.update(0, 0); this.view.update(this.police, this.clock); }

  /** Busted: a fine, and the car starts again on the nearest road, stopped. */
  private busted(car: CarController): void {
    const fine = fineFor(this.io.cash());
    this.io.pay(-fine);
    this.hud.popUp(t('heat.busted', { fine: fine.toLocaleString() }), '#ff4d6d');
    const roads = this.contact.roads;
    roads.nearestAny(this.px, this.pz, this.hit);
    const hd = roads.pointAt(this.hit.edge, this.hit.s, 0, this.p);
    car.reset(this.p.x, this.p.z, hd + (Math.cos(hd - car.state.heading) < 0 ? Math.PI : 0));
    this.cool = 8;
    this.stop();
  }
}
