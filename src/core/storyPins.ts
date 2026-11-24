import type { DistrictId, RoadEdge, RoadGraph } from '../types/world';
import type { StoryEvent } from '../data/story';
import { isUnlocked, type CareerState } from './career';

/** Where a story event waits in the city: a junction in its district. Ring radius in metres. */
export interface StoryPin { event: string; x: number; z: number; district: DistrictId; node: number }
export const PIN_R = 12;
/** 0 locked, 1 available (the next event of the story), 2 done (replay). */
export type PinState = 0 | 1 | 2;

const GAP = 220; // metres between two pins
const AVOID = 80; // metres from other rings (races, drift zones, the meet)
const SKIP = new Set(['highway', 'bridge', 'runway', 'coast']);
const usable = (e: RoadEdge): boolean => !e.tunnel && !SKIP.has(e.kind) && !e.exit;

/**
 * One pin per place, in order: the biggest junction of the district that is far enough from the pins already placed and
 * from `avoid` (other rings). Pure and deterministic for a graph; the gaps shrink when a district is crowded.
 */
export function placeStoryPins(g: RoadGraph, places: readonly { event: string; district: DistrictId }[], avoid: readonly { x: number; z: number }[] = []): StoryPin[] {
  const out: StoryPin[] = [];
  const far = (x: number, z: number, list: readonly { x: number; z: number }[], d: number): boolean => list.every((p) => Math.hypot(p.x - x, p.z - z) >= d);
  for (const p of places) {
    const own = g.nodes.filter((n) => n.district === p.district && n.edges.length >= 2 && n.edges.every((e) => usable(g.edges[e])));
    const cands = (own.length ? own : g.nodes.filter((n) => n.district === p.district && n.edges.length >= 2)).sort((a, b) => b.radius - a.radius || b.edges.length - a.edges.length || a.id - b.id);
    let pick = -1;
    for (const k of [1, 0.6, 0.3, 0]) {
      pick = cands.findIndex((n) => far(n.x, n.z, out, GAP * k) && far(n.x, n.z, avoid, AVOID * k));
      if (pick >= 0) break;
    }
    const n = cands[Math.max(0, pick)] ?? g.nodes[0];
    out.push({ event: p.event, x: n.x, z: n.z, district: n.district, node: n.id });
  }
  return out;
}

/** Fill `out` (one slot per pin): which pins are locked, available or done for this career. No allocation. */
export function pinStates(c: CareerState, pins: readonly StoryPin[], out: Uint8Array): void {
  for (let i = 0; i < pins.length; i++) out[i] = c.completed.includes(pins[i].event) ? 2 : isUnlocked(c, pins[i].event) ? 1 : 0;
}

/** Who greets you at an event's place: the first person who talks in person in its opening lines (not you, the narrator or the radio). */
export function greeter(ev: StoryEvent, override?: string): string {
  if (override) return override;
  return ev.before.find((l) => !l.phone && l.who !== 'narrator' && l.who !== 'rookie' && l.who !== 'switch')?.who ?? 'mara';
}
