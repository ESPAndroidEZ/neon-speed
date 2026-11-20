import type { RoadGraph } from '../types/world';
import { ROAD_NAMES, STREET_NAMES } from '../data/world/districtText';

/**
 * The name of the street an edge belongs to (Neon Harbor, task 066). On the grid, every block of one row (east-west)
 * or one column (north-south) in a district shares a name, so a street keeps its name over many junctions; winding
 * hill roads are named per edge. Pure.
 */
export function streetName(g: RoadGraph, edgeId: number): string {
  const e = g.edges[edgeId];
  if (e.kind in ROAD_NAMES) return ROAD_NAMES[e.kind as keyof typeof ROAD_NAMES];
  const list = STREET_NAMES[e.district], half = Math.max(1, list.length >> 1);
  const a = g.nodes[e.a], b = g.nodes[e.b];
  if (e.district === 'hills') return list[(edgeId * 7) % list.length];
  const ew = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z);
  const line = Math.round((ew ? (a.z + b.z) / 2 : (a.x + b.x) / 2) / 128); // the row or column of the grid
  const k = ((line % half) + half) % half;
  return ew ? list[k] : list[Math.min(list.length - 1, half + k)];
}
