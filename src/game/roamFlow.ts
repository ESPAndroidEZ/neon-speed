import { InstancedMesh, Matrix4, MeshBasicMaterial, OctahedronGeometry, type Group } from 'three';
import type { DistrictId, RoadGraph } from '../types/world';
import { DISTRICTS } from '../types/world';
import type { CarController } from '../physics/carController';
import type { RoamTraffic } from '../physics/roamTraffic';
import { AREA_REP, AreaGuard, districtCentres } from '../core/areaLocks';
import { placeShops, shopAt, type Shop } from '../core/shops';
import { districtAt } from '../data/world/districtMap';
import { heightAt } from '../world/roads/height';
import { zoneMesh } from '../world/open/zoneView';
import { t } from '../i18n';
import { roamToast } from '../ui/roamToast';

/** Traffic cars that are challengers (fixed pool slots: the pool recycles them around the player, so some are always near). */
export const CHALLENGERS: readonly number[] = [5, 18, 31];
/** Pull up this close (m) to a challenger to get the flash-lights prompt. */
const NEAR = 14;
/** A challenger's marker shows within this range (m). */
const SEEN = 260;

/** Between the city step and the launcher (game/flowLaunch.ts): REP level, saved keys, and the two offers. */
export const FLOW_HOOK = {
  level: (): number => 1,
  /** A saved visit / win key (`shop:<kind>`, `win:<map id>`). */
  done: (_key: string): boolean => false,
  shop: (_s: Shop | null): void => {},
  /** A challenger is beside the car (slot index, where), or nobody (-1). */
  challenge: (_slot: number, _x: number, _z: number): void => {},
};

/**
 * World flow in Free Drive (Underground round, stage 2): challenger cars with a marker, shops as rings, and districts that
 * open with REP (the car is turned back at a locked border). Built with RoamActivities and stepped from its step.
 */
export class RoamFlow {
  readonly shops: Shop[];
  readonly centres: { id: DistrictId; x: number; z: number }[];
  /** Story places (set by freeRoam): a district with the next story event in it is open whatever the REP. */
  story: { pins: readonly { x: number; z: number; district: DistrictId }[]; states: Uint8Array } | null = null;
  private readonly guard = new AreaGuard();
  private readonly storyOpen = new Uint8Array(DISTRICTS.length);
  private readonly marks: InstancedMesh;
  private readonly m = new Matrix4();
  private readonly ring: ReturnType<typeof zoneMesh>;
  private readonly traffic: RoamTraffic | null;
  private readonly busy: () => boolean;
  private shopIn = -1;
  private armed = false;
  private near = -1;
  private clock = 0;
  private lockCool = 0;

  constructor(g: RoadGraph, group: Group, traffic: RoamTraffic | null, avoid: readonly { x: number; z: number }[], busy: () => boolean) {
    this.traffic = traffic;
    this.busy = busy;
    this.shops = placeShops(g, avoid);
    this.centres = districtCentres(g);
    this.ring = zoneMesh(this.shops.map((s) => ({ x: s.x, z: s.z, r: 10 })), 0x7dffcf);
    this.marks = new InstancedMesh(new OctahedronGeometry(0.75), new MeshBasicMaterial({ color: 0xff2a9d }), CHALLENGERS.length);
    this.marks.frustumCulled = false;
    group.add(this.ring, this.marks);
  }

  /** Is the district open for this REP level (or the story)? */
  open(d: DistrictId): boolean {
    return FLOW_HOOK.level() >= AREA_REP[d] || this.storyOpen[DISTRICTS.indexOf(d)] === 1;
  }

  /** Fast travel: refuse a locked district with the same message as the border. */
  canGo(d: DistrictId): boolean {
    if (this.open(d)) return true;
    roamToast(t('area.locked', { d: t(`district.${d}` as 'district.bay'), n: AREA_REP[d] }));
    return false;
  }

  /** After a teleport: no shop offer until the car leaves the ring it stands in; a new safe spot. */
  place(x: number, z: number): void {
    this.guard.reset();
    this.armed = shopAt(this.shops, x, z) < 0;
    this.shopIn = -1; this.near = -1;
    FLOW_HOOK.shop(null); FLOW_HOOK.challenge(-1, 0, 0);
  }

  step(car: CarController, dt: number): void {
    const s = car.state, x = s.position.x, z = s.position.z;
    this.clock += dt; this.lockCool = Math.max(0, this.lockCool - dt);
    if (this.story) { this.storyOpen.fill(0); const p = this.story; for (let i = 0; i < p.pins.length; i++) if (p.states[i] === 1) this.storyOpen[DISTRICTS.indexOf(p.pins[i].district)] = 1; }
    const d = districtAt(x, z), bad = this.guard.step(x, z, s.heading, d, this.open(d));
    if (bad) {
      car.reset(this.guard.safeX, this.guard.safeZ, this.guard.safeH + Math.PI);
      if (this.lockCool === 0) { roamToast(t('area.locked', { d: t(`district.${bad}` as 'district.bay'), n: AREA_REP[bad] })); this.lockCool = 2.5; }
    }
    // shops
    const at = shopAt(this.shops, x, z);
    if (at < 0) { this.armed = true; if (this.shopIn >= 0) { this.shopIn = -1; FLOW_HOOK.shop(null); } }
    else if (this.armed && at !== this.shopIn && Math.abs(s.speed) < 11) { this.shopIn = at; FLOW_HOOK.shop(this.shops[at]); }
    // challengers: markers over their roofs, the prompt when beside one
    const tr = this.traffic;
    let close = -1;
    for (let k = 0; k < CHALLENGERS.length; k++) {
      const i = CHALLENGERS[k];
      const ok = tr !== null && i < tr.agents.length && Math.hypot(tr.x[i] - x, tr.z[i] - z) < SEEN;
      if (ok && tr) {
        const cx = tr.x[i], cz = tr.z[i];
        this.m.makeRotationY(this.clock * 2);
        this.m.setPosition(cx, heightAt(cx, cz) + 3.4 + Math.sin(this.clock * 3 + k) * 0.25, cz);
        if (Math.hypot(cx - x, cz - z) < NEAR && !this.busy()) close = k;
      } else this.m.makeScale(0, 0, 0);
      this.marks.setMatrixAt(k, this.m);
    }
    this.marks.instanceMatrix.needsUpdate = true;
    if (close !== this.near) { this.near = close; FLOW_HOOK.challenge(close, close >= 0 && tr ? tr.x[CHALLENGERS[close]] : 0, close >= 0 && tr ? tr.z[CHALLENGERS[close]] : 0); }
  }

  /** Where challenger slot k is now (map markers); null when it is not near. */
  challenger(k: number, near: { x: number; z: number }): { x: number; z: number } | null {
    const tr = this.traffic, i = CHALLENGERS[k];
    if (!tr || i >= tr.agents.length || Math.hypot(tr.x[i] - near.x, tr.z[i] - near.z) > 600) return null;
    return { x: tr.x[i], z: tr.z[i] };
  }

  dispose(): void {
    for (const m of [this.ring, this.marks]) { m.geometry.dispose(); (m.material as { dispose(): void }).dispose(); }
  }
}
