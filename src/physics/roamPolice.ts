import type { RoadGraph } from '../types/world';
import { createRoadHit, type RoadIndex } from '../world/roads/roadIndex';
import { findRoute, nearestNode } from '../core/route';
import { createRng } from '../core/rng';
import { heightAt } from '../world/roads/height';

export const COPS = 3;
const TOP = 58; // m/s, about 210 km/h
const ACCEL = 9, BRAKE = 16;
const GAP = 6; // metres they hold behind the player
const REPLAN = 1.3; // seconds between route updates per cop
const FAR = 1e6;

/**
 * Police cars on the road graph (pure, fixed pool): each cop drives along the quickest route to the player (A*, redone
 * every ~1.3 s), ignores lights, takes junctions slowly and holds a few metres behind the player. They are kinematic like
 * the traffic: the contact and the busted rule live elsewhere (RoamContact boxes, core/police).
 */
export class RoamPolice {
  readonly x = new Float32Array(COPS).fill(FAR);
  readonly z = new Float32Array(COPS).fill(FAR);
  readonly y = new Float32Array(COPS);
  readonly h = new Float32Array(COPS);
  readonly speed = new Float32Array(COPS);
  /** Contact boxes (x, z, heading triples; parked far away when a cop is not out). */
  readonly boxes = new Float32Array(COPS * 3).fill(FAR);
  /** Cops out. */
  count = 0;
  private readonly edge = new Int32Array(COPS);
  private readonly dir = new Int8Array(COPS);
  private readonly s = new Float32Array(COPS);
  private readonly stall = new Float32Array(COPS);
  private readonly replan = new Float32Array(COPS);
  private readonly path: number[][] = Array.from({ length: COPS }, () => []);
  private readonly g: RoadGraph;
  private readonly roads: RoadIndex;
  private readonly rnd: () => number;
  private readonly p = { x: 0, z: 0 };
  private readonly hit = createRoadHit();

  constructor(g: RoadGraph, roads: RoadIndex, seed = 11) {
    this.g = g;
    this.roads = roads;
    this.rnd = createRng(seed);
  }

  /** Bring the number of cops out up to `k`; new ones appear on roads 150 to 280 m from the player, out of sight. */
  send(k: number, px: number, pz: number): void {
    k = Math.min(COPS, k);
    for (let i = this.count; i < k; i++) this.place(i, px, pz);
    this.count = Math.max(this.count, k);
  }

  /** Every cop goes home. */
  stop(): void {
    this.count = 0;
    this.x.fill(FAR); this.z.fill(FAR); this.boxes.fill(FAR); this.speed.fill(0);
  }

  /** The player hit cop i: it stops for a moment. */
  bump(i: number): void { this.speed[i] = 0; this.stall[i] = 1.2; }

  /** Distance from (px, pz) to the nearest cop that is out (Infinity when none). */
  nearest(px: number, pz: number): number {
    let d = Infinity;
    for (let i = 0; i < this.count; i++) d = Math.min(d, Math.hypot(this.x[i] - px, this.z[i] - pz));
    return d;
  }

  step(dt: number, px: number, pz: number, pSpeed: number): void {
    const g = this.g;
    let goal = -1, budget = 1; // at most one route search per step: three cops never replan in the same frame
    for (let i = 0; i < this.count; i++) {
      if (this.stall[i] > 0) { this.stall[i] -= dt; this.speed[i] = 0; continue; }
      const e = g.edges[this.edge[i]], dir = this.dir[i];
      const toEnd = dir > 0 ? e.length - this.s[i] : this.s[i];
      const far = g.nodes[dir > 0 ? e.b : e.a];
      if ((this.replan[i] -= dt) <= 0 && budget > 0) {
        budget--;
        this.replan[i] = REPLAN + this.rnd() * 0.4;
        if (goal < 0) goal = nearestNode(g, px, pz);
        const r = goal >= 0 && goal !== far.id ? findRoute(g, far.id, goal) : null;
        this.path[i] = r ? r.edges : [];
      }
      const dist = Math.hypot(px - this.x[i], pz - this.z[i]);
      let want = Math.min(TOP, Math.max(16, pSpeed * 1.06 + 5), e.limit * 2.6);
      if (dist < 18) want = Math.min(want, Math.max(0, pSpeed * 0.95 + (dist - GAP) * 0.8)); // hold station behind the player
      if (toEnd < 35) want = Math.min(want, 17 + toEnd * 0.6); // junction ahead: slow for the turn
      this.speed[i] += Math.max(-BRAKE * dt, Math.min(ACCEL * dt, want - this.speed[i]));
      this.s[i] += dir * this.speed[i] * dt;
      if (this.s[i] > e.length || this.s[i] < 0) this.turn(i, far.id, px, pz);
      this.pose(i);
    }
  }

  /** Put cop i on a road near the player. */
  private place(i: number, px: number, pz: number): void {
    const g = this.g;
    let pick = -1;
    for (const [lo, hi] of [[120, 230], [80, 420]]) {
      const ok: number[] = [];
      for (const e of g.edges) {
        if (e.kind === 'runway' || e.tunnel) continue;
        const m = Math.floor(e.cum.length / 2) * 2, d = Math.hypot(e.pts[m] - px, e.pts[m + 1] - pz);
        if (d > lo && d < hi) ok.push(e.id);
      }
      if (ok.length) { pick = ok[Math.floor(this.rnd() * ok.length)]; break; }
    }
    if (pick < 0) pick = this.roads.nearestAny(px, pz, this.hit).edge;
    const e = g.edges[pick];
    this.edge[i] = pick;
    this.s[i] = e.length / 2;
    this.dir[i] = e.oneWay ? 1 : Math.hypot(e.pts[e.pts.length - 2] - px, e.pts[e.pts.length - 1] - pz) < Math.hypot(e.pts[0] - px, e.pts[1] - pz) ? 1 : -1; // toward the player
    this.speed[i] = 8; this.stall[i] = 0; this.replan[i] = i * 0.45; this.path[i] = [];
    this.pose(i);
  }

  /** At the end of an edge: the next one of the route, else the street that gets closest to the player. */
  private turn(i: number, nodeId: number, px: number, pz: number): void {
    const g = this.g, n = g.nodes[nodeId], cur = this.edge[i];
    const ok = (id: number): boolean => id !== cur && (!g.edges[id].oneWay || g.edges[id].a === nodeId) && !g.edges[id].tunnel;
    let next = -1;
    const want = this.path[i][0];
    if (want !== undefined && n.edges.includes(want) && ok(want)) { next = want; this.path[i].shift(); }
    else {
      let best = Infinity;
      for (const id of n.edges) {
        if (!ok(id)) continue;
        const e = g.edges[id], o = g.nodes[e.a === nodeId ? e.b : e.a], d = Math.hypot(o.x - px, o.z - pz);
        if (d < best) { best = d; next = id; }
      }
    }
    if (next < 0) { // dead end: turn round
      this.dir[i] = (this.dir[i] > 0 ? -1 : 1) as 1 | -1;
      this.s[i] = Math.min(g.edges[cur].length, Math.max(0, this.s[i]));
      return;
    }
    const e = g.edges[next];
    this.edge[i] = next;
    this.dir[i] = e.a === nodeId ? 1 : -1;
    this.s[i] = this.dir[i] > 0 ? 0 : e.length;
  }

  private pose(i: number): void {
    const e = this.g.edges[this.edge[i]], s = this.s[i];
    const h = this.roads.pointAt(e.id, s, 0, this.p);
    this.x[i] = this.p.x; this.z[i] = this.p.z;
    this.h[i] = this.dir[i] > 0 ? h : h + Math.PI;
    let y = heightAt(this.p.x, this.p.z);
    if (e.ys) {
      let k = 0;
      while (k + 2 < e.cum.length && e.cum[k + 1] < s) k++;
      y = e.ys[k] + (e.ys[k + 1] - e.ys[k]) * Math.min(1, Math.max(0, (s - e.cum[k]) / Math.max(1e-3, e.cum[k + 1] - e.cum[k])));
    }
    this.y[i] = y;
    this.boxes[i * 3] = this.x[i]; this.boxes[i * 3 + 1] = this.z[i]; this.boxes[i * 3 + 2] = this.h[i];
  }
}
