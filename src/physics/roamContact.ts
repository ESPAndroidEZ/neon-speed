import type { Footprint, RoadGraph } from '../types/world';
import { SURFACES } from '../types/world';
import type { CarController } from './carController';
import { wallHit } from './wallHit';
import type { RoamTraffic } from './roamTraffic';
import { CELL, isWater } from '../data/world/districtMap';
import { heightAt, slopeAlong } from '../world/roads/height';
import { RoadIndex, createRoadHit } from '../world/roads/roadIndex';
import { trafficSize } from './trafficSize';
import { GridHash } from '../world/roads/spatial';
import { obbHit, type ObbOut } from './obbHit';

const HALF_W = 0.92, HALF_L = 2.1; // car half width / length (same as TrackContact)
const POINTS: readonly (readonly [number, number])[] = [
  [HALF_W, HALF_L], [-HALF_W, HALF_L], [HALF_W, -HALF_L], [-HALF_W, -HALF_L], [HALF_W, 0], [-HALF_W, 0], [0, HALF_L], [0, -HALF_L],
];
const BORDER = 6; // metres inside the world edge
/** Share of a hit's impulse the player takes: a wall or a building takes none of it, a traffic car about half (it is bumped away). */
const CAR_SHARE = 0.55, COP_SHARE = 0.7;

/**
 * Car vs the open city (pure, no allocation per step): tyre surface from the road index (asphalt, wet, kerb, grass),
 * road height (bridge deck profile or terrain), and walls: building footprints, the quay edge (water is a wall except on
 * a road such as the bridge) and the world border. Same wall response as races (`wallHit`).
 */
export class RoamContact {
  impact = 0;
  scrape = 0;
  readonly contact = { x: 0, z: 0 };
  offroad = false;
  groundY = 0;
  pitch = 0;
  /** Rain 0..1: low spots of the tarmac hold water. */
  rain = 0;
  /** City traffic: solid boxes; a car hit hard stops for a moment. */
  traffic: RoamTraffic | null = null;
  /** Parked cars (x, z, heading triples): solid like traffic, never move. */
  parked: Float32Array = new Float32Array(0);
  /** Police cars (x, z, heading triples, see RoamPolice.boxes): solid like traffic; `onCop` is told which one was hit. */
  police: Float32Array = new Float32Array(0);
  onCop: ((i: number) => void) | null = null;
  /** The traffic car the last step hit (-1 none), for the police heat. */
  hitCar = -1;
  private hitCop = -1;
  private hitSide = 1;
  readonly roads: RoadIndex;
  private readonly graph: RoadGraph;
  private readonly fs: readonly Footprint[];
  private readonly hash: GridHash;
  private readonly hit = createRoadHit();
  private wb = 0; private wnx = 0; private wnz = 0;
  private pen = 0; private nx = 0; private nz = 0; private px = 0; private pz = 0; private share = 1;
  private readonly ob: ObbOut = { pen: 0, nx: 0, nz: 0, px: 0, pz: 0 };
  private cx0 = 0; private cz0 = 0; private ch0 = 0;
  /** Last spot where the car touched nothing too deep (the seam fallback; a jump of over 6 m between steps is a teleport and clears it). */
  private cleanX = 0; private cleanZ = 0; private clean = false; private lastX = 0; private lastZ = 0;

  constructor(graph: RoadGraph, fs: readonly Footprint[], roads = new RoadIndex(graph)) {
    this.graph = graph;
    this.fs = fs;
    this.roads = roads;
    this.hash = new GridHash(graph.half, 32);
    fs.forEach((f, i) => { const r = Math.hypot(f.hw, f.hd); this.hash.insert(i, f.x - r, f.z - r, f.x + r, f.z + r); });
  }

  update(car: CarController): void {
    const st = car.state, x = st.position.x, z = st.position.z;
    this.impact = 0;
    this.scrape = 0;
    const kind = this.roads.surfaceAt(x, z, this.rain);
    const sf = SURFACES[kind];
    this.offroad = kind === 'grass';
    car.surfaceGrip = sf.grip;
    car.surfaceDrag = sf.drag;
    car.steerAuthority = 1;
    const h = this.roads.nearest(x, z, this.hit);
    const e = h.edge >= 0 ? this.graph.edges[h.edge] : null;
    if (e?.ys && h.dist <= e.width / 2 + 1) { // bridge deck / ramp: the edge's own profile
      let k = 0;
      while (k + 2 < e.cum.length && e.cum[k + 1] < h.s) k++;
      const t = (h.s - e.cum[k]) / Math.max(1e-3, e.cum[k + 1] - e.cum[k]);
      this.groundY = e.ys[k] + (e.ys[k + 1] - e.ys[k]) * t;
      this.pitch = Math.atan(((e.ys[k + 1] - e.ys[k]) / Math.max(1e-3, e.cum[k + 1] - e.cum[k])) * (Math.sin(st.heading) * h.tx + Math.cos(st.heading) * h.tz));
    } else {
      this.groundY = heightAt(x, z);
      this.pitch = Math.atan(slopeAlong(x, z, st.heading));
    }
    st.position.y = this.groundY;
    if (Math.hypot(x - this.lastX, z - this.lastZ) > 6) this.clean = false; // a teleport (respawn, fast travel): never pulled back
    this.pen = 0;
    this.hitCar = -1; this.hitCop = -1;
    const pvx = st.velocity.x, pvz = st.velocity.z;
    // up to three passes: pushing out of the deepest contact can push into a neighbour (two buildings, a car by a wall)
    for (let pass = 0; pass < 3; pass++) {
      if (pass > 0) this.pen = 0;
      this.probe(st.position.x, st.position.z, st.heading);
      if (this.pen <= 0) break;
      const imp = this.impact;
      wallHit(car, this.pen, this.nx, this.nz, this.px, this.pz, this, this.share);
      this.impact = Math.max(imp, this.impact);
      if (pass === 2) { this.pen = 0; this.probe(st.position.x, st.position.z, st.heading); }
    }
    // still inside something (a seam between two buildings narrower than the car): back to the last clean spot
    if (this.pen > 0.05 && this.clean) car.nudge(this.cleanX - st.position.x, this.cleanZ - st.position.z, -st.velocity.x * 0.8, -st.velocity.z * 0.8, 0);
    else if (this.pen <= 0.05) { this.cleanX = st.position.x; this.cleanZ = st.position.z; this.clean = true; }
    this.lastX = st.position.x; this.lastZ = st.position.z;
    if (this.hitCar >= 0 && this.impact > 2) this.traffic?.bump(this.hitCar, pvx, pvz, this.hitSide);
    if (this.hitCop >= 0 && this.impact > 2) this.onCop?.(this.hitCop);
  }

  /**
   * Camera line of sight (the chase camera's spring arm in Free Drive): the free fraction 0..1 of the segment from the
   * car (ax, az) to the camera (bx, bz) at height y, sampled every 0.8 m against buildings taller than y. No allocation.
   */
  rayFree(ax: number, az: number, bx: number, bz: number, y: number): number {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 0.8));
    for (let k = 1; k <= n; k++) {
      const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, list = this.hash.at(x, z);
      for (let i = 0; i < list.length; i++) {
        const f = this.fs[list[i]];
        if (f.height < y) continue;
        const fx = Math.sin(f.rot), fz = Math.cos(f.rot), dx = x - f.x, dz = z - f.z;
        if (Math.abs(dx * fz - dz * fx) < f.hw + 0.3 && Math.abs(dx * fx + dz * fz) < f.hd + 0.3) return (k - 1) / n;
      }
    }
    return 1;
  }

  /** Every obstacle against the car box at (x, z, h): the deepest contact ends up in pen / nx / nz / px / pz / share. */
  private probe(x: number, z: number, h: number): void {
    const sh = Math.sin(h), ch = Math.cos(h);
    this.share = 1; this.cx0 = x; this.cz0 = z; this.ch0 = h;
    for (let k = 0; k < POINTS.length; k++) {
      const cx = x + ch * POINTS[k][0] + sh * POINTS[k][1];
      const cz = z - sh * POINTS[k][0] + ch * POINTS[k][1];
      if (k < 4) this.buildings(cx, cz); // the hash cells under the four corners; each building is a box test (obbHit)
      this.water(cx, cz);
      this.border(cx, cz);
    }
    this.cars();
    this.boxes(this.parked, false);
    this.boxes(this.police, true);
  }

  private set(pen: number, nx: number, nz: number, px: number, pz: number, share = 1): boolean {
    if (pen <= this.pen) return false;
    this.pen = pen; this.nx = nx; this.nz = nz; this.px = px; this.pz = pz; this.share = share;
    return true;
  }

  /** The car's box against one obstacle box; true when it became the deepest contact. */
  private box(bx: number, bz: number, br: number, bw: number, bd: number, share: number): boolean {
    const o = this.ob;
    return obbHit(this.cx0, this.cz0, this.ch0, HALF_W, HALF_L, bx, bz, br, bw, bd, o) && this.set(o.pen, o.nx, o.nz, o.px, o.pz, share);
  }

  private buildings(cx: number, cz: number): void {
    const list = this.hash.at(cx, cz);
    for (let i = 0; i < list.length; i++) {
      const f = this.fs[list[i]];
      this.box(f.x, f.z, f.rot, f.hw, f.hd, 1);
    }
  }

  /** Water cells are 512 m squares of the district map: push back across the nearest border with land behind it. */
  private water(cx: number, cz: number): void {
    if (!isWater(cx, cz)) return;
    const h = this.roads.nearest(cx, cz, this.hit);
    if (h.edge >= 0 && h.dist <= this.graph.edges[h.edge].width / 2 + 0.5) return; // the bridge
    const half = this.graph.half;
    const x0 = Math.floor((cx + half) / CELL) * CELL - half, z0 = Math.floor((cz + half) / CELL) * CELL - half;
    this.wb = Infinity;
    this.edgeTry(cx - x0, x0 - 1, cz, -1, 0);
    this.edgeTry(x0 + CELL - cx, x0 + CELL + 1, cz, 1, 0);
    this.edgeTry(cz - z0, cx, z0 - 1, 0, -1);
    this.edgeTry(z0 + CELL - cz, cx, z0 + CELL + 1, 0, 1);
    if (this.wb < 40) this.set(this.wb, this.wnx, this.wnz, cx, cz); // deep water (should not happen): leave it to the respawn
  }

  private edgeTry(d: number, lx: number, lz: number, ux: number, uz: number): void {
    if (d < this.wb && !isWater(lx, lz)) { this.wb = d; this.wnx = ux; this.wnz = uz; }
  }

  /** Parked cars and police cars: solid boxes from (x, z, heading) triples. */
  private boxes(p: Float32Array, cop: boolean): void {
    for (let i = 0; i + 2 < p.length; i += 3) {
      const dx = this.cx0 - p[i], dz = this.cz0 - p[i + 1];
      if (dx * dx + dz * dz > 36) continue;
      if (this.box(p[i], p[i + 1], p[i + 2], 0.9, 2.2, cop ? COP_SHARE : 1) && cop) this.hitCop = i / 3;
    }
  }

  /** Traffic cars as boxes of their shape's size (physics/trafficSize; same test as buildings). */
  private cars(): void {
    const t = this.traffic;
    if (!t) return;
    for (let i = 0; i < t.agents.length; i++) {
      const dx = this.cx0 - t.x[i], dz = this.cz0 - t.z[i];
      if (dx * dx + dz * dz > 64) continue;
      const sz = trafficSize(t.agents[i].variant);
      if (!this.box(t.x[i], t.z[i], t.h[i], sz[0] / 2, sz[1] / 2, CAR_SHARE)) continue;
      // which side of the traffic car was hit (for its spin): its local frame at the contact point
      const fx = Math.sin(t.h[i]), fz = Math.cos(t.h[i]), qx = this.ob.px - t.x[i], qz = this.ob.pz - t.z[i];
      this.hitCar = i; this.hitSide = Math.sign((qx * fz - qz * fx) * (qx * fx + qz * fz)) || 1;
    }
  }

  private border(cx: number, cz: number): void {
    const lim = this.graph.half - BORDER;
    if (cx > lim) this.set(cx - lim, -1, 0, cx, cz);
    if (cx < -lim) this.set(-lim - cx, 1, 0, cx, cz);
    if (cz > lim) this.set(cz - lim, 0, -1, cx, cz);
    if (cz < -lim) this.set(-lim - cz, 0, 1, cx, cz);
  }
}
