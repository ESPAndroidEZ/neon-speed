import type { RoadGraph } from '../types/world';
import type { DriftZone } from './driftZones';

/** The car meet: a circle at a harbour junction and the parking slots of the cars that hang out there. */
export interface CarMeet { x: number; z: number; r: number; slots: { x: number; z: number; h: number }[] }

/** The harbour's biggest junction that is at least 200 m from every drift zone; 8 cars in a half circle facing its centre. */
export function placeCarMeet(g: RoadGraph, zones: readonly DriftZone[]): CarMeet | null {
  const n = g.nodes.filter((x) => x.district === 'harbour' && x.edges.length >= 3 && zones.every((z) => Math.hypot(z.x - x.x, z.z - x.z) >= 200))
    .sort((a, b) => b.radius - a.radius || b.edges.length - a.edges.length || a.id - b.id)[0];
  if (!n) return null;
  const r = 24, slots: CarMeet['slots'] = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * (0.15 + (0.7 * i) / 7); // a half circle on one side, the open side for the player
    const x = n.x + Math.cos(a) * (r - 6), z = n.z + Math.sin(a) * (r - 6);
    slots.push({ x, z, h: Math.atan2(n.x - x, n.z - z) }); // nose to the centre
  }
  return { x: n.x, z: n.z, r, slots };
}

/** True once per visit: the player has stood (under 1 m/s) inside the meet for 2 s. Leaving resets it. Pure, no allocation. */
export class MeetWatch {
  private t = 0;
  private told = false;
  private readonly m: CarMeet;

  constructor(m: CarMeet) {
    this.m = m;
  }

  update(x: number, z: number, speed: number, dt: number): boolean {
    if (Math.hypot(x - this.m.x, z - this.m.z) > this.m.r) { this.t = 0; this.told = false; return false; }
    this.t = Math.abs(speed) < 1 ? this.t + dt : 0;
    if (this.t >= 2 && !this.told) { this.told = true; return true; }
    return false;
  }
}
