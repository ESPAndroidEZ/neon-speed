import type { RoadGraph, TrafficAgent } from '../types/world';
import { createRng } from '../core/rng';

/** Traffic lights: each axis gets green, then yellow, then the other axis (s). */
export const LIGHT_GREEN = 12, LIGHT_YELLOW = 3, LIGHT_CYCLE = 2 * (LIGHT_GREEN + LIGHT_YELLOW);
/** Corner speed cap: lateral acceleration a traffic car may use (m/s^2) at grip 1; below the player's car (~0.9 g). */
export const TRAFFIC_LAT_G = 0.55 * 9.81;
const GAP = 9; // metres kept to the car ahead (bumper to bumper incl. car length)
const ACCEL = 2.2, BRAKE = 6;
const TURN_SPEED = 7; // m/s through a junction
const SPAWN_R = 320, DESPAWN_R = 420;

/** Where in its cycle the light at `n` is for a car heading (dx, dz): 0..LIGHT_CYCLE s (lights alternate the two axes). */
const phaseOf = (n: { id: number }, t: number, dx: number, dz: number): number => {
  const ph = (t + n.id * 3.7) % LIGHT_CYCLE; // offset per junction so the city does not switch in step
  return Math.abs(dz) >= Math.abs(dx) ? ph : (ph + LIGHT_GREEN + LIGHT_YELLOW) % LIGHT_CYCLE;
};

/** 0 green, 1 yellow, 2 red for a car arriving at node `n` along heading (dx, dz). No light: always green. */
export function lightFor(n: { id: number; light: boolean }, t: number, dx: number, dz: number): 0 | 1 | 2 {
  if (!n.light) return 0;
  const p = phaseOf(n, t, dx, dz);
  return p < LIGHT_GREEN ? 0 : p < LIGHT_GREEN + LIGHT_YELLOW ? 1 : 2;
}

/** Seconds of yellow left (0 when not yellow). */
export function yellowLeft(n: { id: number; light: boolean }, t: number, dx: number, dz: number): number {
  const p = phaseOf(n, t, dx, dz);
  return n.light && p >= LIGHT_GREEN && p < LIGHT_GREEN + LIGHT_YELLOW ? LIGHT_GREEN + LIGHT_YELLOW - p : 0;
}

/**
 * Kinematic city traffic on the road graph (pure, fixed pool, no allocation per step): cars follow their lane, keep a
 * gap to the car ahead, stop for red lights and for the player, slow for corners within TRAFFIC_LAT_G x grip, pick a
 * random next street at junctions, and are recycled in a ring around the player. A car the player hits stops a while.
 */
export class RoamTraffic {
  readonly agents: TrafficAgent[] = [];
  /** World pose per agent (x, z, heading), filled by `step`. */
  readonly x: Float32Array;
  readonly z: Float32Array;
  readonly h: Float32Array;
  private readonly stall: Float32Array;
  /** Per car, the decision taken when its light turned yellow: 0 none, 1 go, 2 stop (kept until green or the next street). */
  private readonly yellow: Int8Array;
  private readonly g: RoadGraph;
  private readonly rnd: () => number;
  private readonly near: number[] = [];
  private nx = 0; private nz = 0; // where `near` was collected
  time = 0;

  constructor(g: RoadGraph, count = 40, seed = 3) {
    this.g = g;
    this.rnd = createRng(seed);
    this.x = new Float32Array(count); this.z = new Float32Array(count); this.h = new Float32Array(count); this.stall = new Float32Array(count);
    this.yellow = new Int8Array(count);
    for (let i = 0; i < count; i++) this.agents.push({ edge: 0, lane: 0, dir: 1, s: 0, speed: 0, variant: i % 8, role: 'civil' });
  }

  /** Put every car on a road near (px, pz): call once when free roam starts or after a fast travel. */
  scatter(px: number, pz: number): void {
    this.collectNear(px, pz);
    for (let i = 0; i < this.agents.length; i++) this.respawn(i);
    this.poses();
  }

  /** Stop car i for a few seconds (the player hit it). */
  bump(i: number): void {
    this.agents[i].speed = 0;
    this.stall[i] = 3;
  }

  step(dt: number, px: number, pz: number, grip: number): void {
    this.time += dt;
    const g = this.g;
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i], e = g.edges[a.edge];
      if (Math.hypot(this.x[i] - px, this.z[i] - pz) > DESPAWN_R) { if (Math.hypot(px - this.nx, pz - this.nz) > 120) this.collectNear(px, pz); this.respawn(i); continue; }
      if (this.stall[i] > 0) { this.stall[i] -= dt; continue; }
      let want = Math.min(e.limit, this.cornerLimit(e, a.s, a.dir, grip));
      const toEnd = a.dir > 0 ? e.length - a.s : a.s;
      const end = g.nodes[a.dir > 0 ? e.b : e.a];
      const hx = Math.sin(this.h[i]), hz = Math.cos(this.h[i]);
      const lamp = lightFor(end, this.time, hx, hz);
      const stopAt = toEnd - end.radius - 2; // stop line
      if (lamp === 0) this.yellow[i] = 0;
      else if (lamp === 1 && this.yellow[i] === 0) { // decide once per yellow: stop only if the car can (else it is a dilemma: go)
        const canStop = (a.speed * a.speed) / (2 * BRAKE) <= stopAt, canClear = stopAt <= a.speed * yellowLeft(end, this.time, hx, hz) * 0.8;
        this.yellow[i] = canClear || !canStop ? 1 : 2;
      }
      const going = this.yellow[i] === 1 && stopAt > -1;
      if (toEnd < 30 && !going) want = Math.min(want, TURN_SPEED + toEnd * 0.4); // ease off for the turn at the junction
      if (stopAt > 0 && stopAt < 8 && this.occupied(end, i)) want = Math.min(want, Math.max(0, stopAt - 1)); // give way: someone is in the junction
      const late = lamp === 1 && this.yellow[i] === 2;
      if (stopAt > -1 && ((lamp === 2 && !going) || late)) want = Math.min(want, Math.max(0, Math.sqrt(Math.max(0, 2 * BRAKE * 0.6 * stopAt))));
      const ahead = this.gapAhead(i, px, pz);
      if (ahead < 40) want = Math.min(want, Math.max(0, (ahead - GAP) * 0.9));
      a.speed += Math.max(-BRAKE * dt, Math.min(ACCEL * dt, want - a.speed));
      a.s += a.dir * a.speed * dt;
      if (a.s > e.length || a.s < 0) this.turn(i, end.id);
    }
    this.poses();
  }

  /** Fill x, z, h from edge, lane and s. */
  poses(): void {
    for (let i = 0; i < this.agents.length; i++) this.pose(i);
  }

  private pose(i: number): void {
    const a = this.agents[i], e = this.g.edges[a.edge];
    let k = 0;
    while (k + 2 < e.cum.length && e.cum[k + 1] < a.s) k++;
    const len = e.cum[k + 1] - e.cum[k] || 1, t = Math.min(1, Math.max(0, (a.s - e.cum[k]) / len));
    const tx = (e.pts[k * 2 + 2] - e.pts[k * 2]) / len, tz = (e.pts[k * 2 + 3] - e.pts[k * 2 + 1]) / len;
    const per = Math.max(1, e.lanes / 2), laneW = e.width / e.lanes;
    const lat = -a.dir * (e.width / 2 - (Math.min(a.lane, per - 1) + 0.5) * laneW); // right-hand traffic: right of travel
    this.x[i] = e.pts[k * 2] + tx * len * t + tz * lat;
    this.z[i] = e.pts[k * 2 + 1] + tz * len * t - tx * lat;
    this.h[i] = Math.atan2(tx * a.dir, tz * a.dir);
  }

  /** Is another car inside junction `n` (within its patch)? */
  private occupied(n: { x: number; z: number; radius: number }, i: number): boolean {
    for (let j = 0; j < this.agents.length; j++) if (j !== i && Math.hypot(this.x[j] - n.x, this.z[j] - n.z) < n.radius + 2.5) return true;
    return false;
  }

  /** Corner speed at the next bend ahead in the driving direction: v = sqrt(a_lat * grip * R). */
  private cornerLimit(e: RoadGraph['edges'][number], s: number, dir: 1 | -1, grip: number): number {
    if (e.cum.length < 3) return Infinity;
    let k = 1;
    if (dir > 0) while (k + 1 < e.cum.length - 1 && e.cum[k] < s) k++;
    else { k = e.cum.length - 2; while (k > 1 && e.cum[k] > s) k--; }
    const ax = e.pts[k * 2] - e.pts[k * 2 - 2], az = e.pts[k * 2 + 1] - e.pts[k * 2 - 1];
    const bx = e.pts[k * 2 + 2] - e.pts[k * 2], bz = e.pts[k * 2 + 3] - e.pts[k * 2 + 1];
    const la = Math.hypot(ax, az) || 1, lb = Math.hypot(bx, bz) || 1;
    const turn = Math.acos(Math.min(1, Math.max(-1, (ax * bx + az * bz) / (la * lb))));
    if (turn < 1e-3) return Infinity;
    const r = Math.min(la, lb) / turn;
    return Math.sqrt(TRAFFIC_LAT_G * grip * r);
  }

  /** Distance to the nearest thing ahead in this car's lane: another car, or the player (m). */
  private gapAhead(i: number, px: number, pz: number): number {
    const hx = Math.sin(this.h[i]), hz = Math.cos(this.h[i]);
    let best = Infinity;
    for (let j = 0; j <= this.agents.length; j++) { // j === length: the player
      if (j === i) continue;
      const dx = (j < this.agents.length ? this.x[j] : px) - this.x[i], dz = (j < this.agents.length ? this.z[j] : pz) - this.z[i];
      const along = dx * hx + dz * hz, side = Math.abs(dx * hz - dz * hx);
      if (along > 0 && side < 2.2 && along < best) best = along;
    }
    return best;
  }

  /** At the end of an edge: another street from that node, entered the way it may be driven (one-way: a -> b only). */
  private turn(i: number, nodeId: number): void {
    const a = this.agents[i], n = this.g.nodes[nodeId];
    let count = 0;
    for (const id of n.edges) if (this.enterable(id, a.edge, nodeId)) count++;
    if (count === 0) { // dead end (or only one-ways pointing in): turn back if allowed, else start over elsewhere
      const cur = this.g.edges[a.edge];
      if (cur.oneWay) return this.respawn(i);
      a.dir = cur.a === nodeId ? 1 : -1;
      a.s = a.dir > 0 ? 0 : cur.length;
      return;
    }
    let pick = Math.floor(this.rnd() * count), next = a.edge;
    for (const id of n.edges) if (this.enterable(id, a.edge, nodeId) && pick-- === 0) { next = id; break; }
    const e = this.g.edges[next];
    a.edge = next;
    a.dir = e.a === nodeId ? 1 : -1;
    a.s = a.dir > 0 ? 0 : e.length;
    a.lane = Math.min(a.lane, Math.max(1, e.lanes / 2) - 1);
    a.speed = Math.min(a.speed, e.limit);
    this.yellow[i] = 0;
  }

  /** May a car leaving edge `from` at node `nodeId` take edge `id`? (not back the same way; one-ways only a -> b) */
  private enterable(id: number, from: number, nodeId: number): boolean {
    const e = this.g.edges[id];
    return id !== from && (!e.oneWay || e.a === nodeId);
  }

  private collectNear(px: number, pz: number): void {
    this.nx = px; this.nz = pz;
    this.near.length = 0;
    for (const e of this.g.edges) {
      if (e.kind === 'runway') continue;
      const mx = e.pts[Math.floor(e.cum.length / 2) * 2], mz = e.pts[Math.floor(e.cum.length / 2) * 2 + 1];
      const d = Math.hypot(mx - px, mz - pz);
      if (d < SPAWN_R && d > 60) this.near.push(e.id); // not on top of the player
    }
  }

  /** A free spot on a street near the player (a few tries: never on top of another car or inside a junction). */
  private respawn(i: number): void {
    const a = this.agents[i];
    if (this.near.length === 0) return;
    for (let tries = 0; tries < 6; tries++) {
      const e = this.g.edges[this.near[Math.floor(this.rnd() * this.near.length)]];
      const na = this.g.nodes[e.a], nb = this.g.nodes[e.b];
      a.edge = e.id;
      a.dir = e.oneWay || this.rnd() < 0.5 ? 1 : -1;
      a.lane = Math.floor(this.rnd() * Math.max(1, e.lanes / 2));
      a.s = na.radius + 25 + this.rnd() * Math.max(0, e.length - na.radius - nb.radius - 50); // never just before a stop line: room to brake
      a.speed = Math.min(e.limit * 0.6, TURN_SPEED);
      this.stall[i] = 0;
      this.pose(i);
      let clear = true;
      for (let j = 0; j < this.agents.length && clear; j++) if (j !== i && Math.hypot(this.x[j] - this.x[i], this.z[j] - this.z[i]) < 15) clear = false;
      if (clear) return;
    }
  }
}
