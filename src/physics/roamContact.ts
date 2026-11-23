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

const HALF_W = 0.92, HALF_L = 2.1; // car half width / length (same as TrackContact)
const POINTS: readonly (readonly [number, number])[] = [
  [HALF_W, HALF_L], [-HALF_W, HALF_L], [HALF_W, -HALF_L], [-HALF_W, -HALF_L], [HALF_W, 0], [-HALF_W, 0], [0, HALF_L], [0, -HALF_L],
];
const BORDER = 6; // metres inside the world edge

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
  private hitCar = -1;
  private hitSide = 1;
  readonly roads: RoadIndex;
  private readonly graph: RoadGraph;
  private readonly fs: readonly Footprint[];
  private readonly hash: GridHash;
  private readonly hit = createRoadHit();
  private wb = 0; private wnx = 0; private wnz = 0;
  private pen = 0; private nx = 0; private nz = 0; private px = 0; private pz = 0;

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
    const sh = Math.sin(st.heading), ch = Math.cos(st.heading);
    this.pen = 0;
    this.hitCar = -1;
    const pvx = st.velocity.x, pvz = st.velocity.z;
    for (let k = 0; k < POINTS.length; k++) {
      const cx = x + ch * POINTS[k][0] + sh * POINTS[k][1];
      const cz = z - sh * POINTS[k][0] + ch * POINTS[k][1];
      this.buildings(cx, cz);
      this.water(cx, cz);
      this.border(cx, cz);
      this.cars(cx, cz);
      this.parkedCars(cx, cz);
    }
    if (this.pen > 0) wallHit(car, this.pen, this.nx, this.nz, this.px, this.pz, this);
    if (this.hitCar >= 0 && this.impact > 2) this.traffic?.bump(this.hitCar, pvx, pvz, this.hitSide);
  }

  private set(pen: number, nx: number, nz: number, px: number, pz: number): void {
    if (pen <= this.pen) return;
    this.pen = pen; this.nx = nx; this.nz = nz; this.px = px; this.pz = pz;
  }

  private buildings(cx: number, cz: number): void {
    const list = this.hash.at(cx, cz);
    for (let i = 0; i < list.length; i++) {
      const f = this.fs[list[i]];
      const fx = Math.sin(f.rot), fz = Math.cos(f.rot); // local +Z; local +X is (fz, -fx)
      const dx = cx - f.x, dz = cz - f.z;
      const lz = dx * fx + dz * fz, lx = dx * fz - dz * fx;
      const ox = f.hw - Math.abs(lx), oz = f.hd - Math.abs(lz);
      if (ox <= 0 || oz <= 0) continue;
      if (ox < oz) this.set(ox, fz * Math.sign(lx), -fx * Math.sign(lx), cx, cz);
      else this.set(oz, fx * Math.sign(lz), fz * Math.sign(lz), cx, cz);
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

  private parkedCars(cx: number, cz: number): void {
    const p = this.parked;
    for (let i = 0; i + 2 < p.length; i += 3) {
      const dx = cx - p[i], dz = cz - p[i + 1];
      if (dx * dx + dz * dz > 9) continue;
      const fx = Math.sin(p[i + 2]), fz = Math.cos(p[i + 2]);
      const lz = dx * fx + dz * fz, lx = dx * fz - dz * fx, ox = 0.9 - Math.abs(lx), oz = 2.2 - Math.abs(lz);
      if (ox <= 0 || oz <= 0) continue;
      if (ox < oz) this.set(ox, fz * Math.sign(lx), -fx * Math.sign(lx), cx, cz);
      else this.set(oz, fx * Math.sign(lz), fz * Math.sign(lz), cx, cz);
    }
  }

  /** Traffic cars as boxes of their shape's size (physics/trafficSize; same test as buildings). */
  private cars(cx: number, cz: number): void {
    const t = this.traffic;
    if (!t) return;
    for (let i = 0; i < t.agents.length; i++) {
      const dx = cx - t.x[i], dz = cz - t.z[i];
      if (dx * dx + dz * dz > 9) continue;
      const fx = Math.sin(t.h[i]), fz = Math.cos(t.h[i]);
      const lz = dx * fx + dz * fz, lx = dx * fz - dz * fx;
      const sz = trafficSize(t.agents[i].variant), ox = sz[0] / 2 - Math.abs(lx), oz = sz[1] / 2 - Math.abs(lz);
      if (ox <= 0 || oz <= 0) continue;
      const before = this.pen;
      if (ox < oz) this.set(ox, fz * Math.sign(lx), -fx * Math.sign(lx), cx, cz);
      else this.set(oz, fx * Math.sign(lz), fz * Math.sign(lz), cx, cz);
      if (this.pen > before) { this.hitCar = i; this.hitSide = Math.sign(lx * lz) || 1; }
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
