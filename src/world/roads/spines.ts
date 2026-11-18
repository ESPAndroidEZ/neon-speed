import type { DistrictId, RoadEdge, RoadGraph, RoadKind, RoadNode } from '../../types/world';
import { ROADS } from './grammar';
import { heightAt } from './height';

const CURVE_STEPS = 6;
/** The runway: lattice line x = RUNWAY_X between these z (m); no street crosses it. */
const RUNWAY_X = 2688, RUNWAY_Z0 = -640, RUNWAY_Z1 = 1024; // 1664 m, on lattice lines
/** Bay Bridge ends (m) and the deck's rise at mid-span above the straight line between its ends. */
export const BRIDGE_A = { x: -2048, z: -1024 }, BRIDGE_B = { x: -1024, z: -2048 };
const BRIDGE_RISE = 26, BRIDGE_STEPS = 32;

/** A runway node strictly inside the strip (crossings there are removed). */
export const onRunway = (x: number, z: number): boolean => x === RUNWAY_X && z > RUNWAY_Z0 && z < RUNWAY_Z1;
/** Runway nodes including both ends: never jittered, so the strip is dead straight. */
export const runwayNode = (x: number, z: number): boolean => x === RUNWAY_X && z >= RUNWAY_Z0 && z <= RUNWAY_Z1;

/** 'on' = a lattice link that is part of the runway, 'cross' = a link that would cross it, null = neither. */
export function runwayEdge(ax: number, az: number, bx: number, bz: number): 'on' | 'cross' | null {
  if (ax === RUNWAY_X && bx === RUNWAY_X && Math.min(az, bz) >= RUNWAY_Z0 && Math.max(az, bz) <= RUNWAY_Z1) return 'on';
  if (az === bz && (onRunway(ax, az) || onRunway(bx, bz))) return 'cross';
  return null;
}

function polyline(ax: number, az: number, bx: number, bz: number, bow: number, steps: number): Float32Array {
  const len = Math.hypot(bx - ax, bz - az) || 1;
  const cx = (ax + bx) / 2 - ((bz - az) / len) * bow * 2, cz = (az + bz) / 2 + ((bx - ax) / len) * bow * 2;
  const n = Math.abs(bow) < 0.5 && steps <= 1 ? 1 : Math.max(steps, CURVE_STEPS);
  const p = new Float32Array((n + 1) * 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    p[i * 2] = u * u * ax + 2 * u * t * cx + t * t * bx;
    p[i * 2 + 1] = u * u * az + 2 * u * t * cz + t * t * bz;
  }
  return p;
}

/** A road edge between two nodes with the kind's width, lanes and limit; `bow` bends it (m), `steps` forces subdivisions. */
export function makeEdge(id: number, na: RoadNode, nb: RoadNode, kind: RoadKind, d: DistrictId, bow: number, steps = 1): RoadEdge {
  const pts = polyline(na.x, na.z, nb.x, nb.z, bow, steps);
  const cum = new Float32Array(pts.length / 2);
  for (let k = 1; k < cum.length; k++) cum[k] = cum[k - 1] + Math.hypot(pts[k * 2] - pts[k * 2 - 2], pts[k * 2 + 1] - pts[k * 2 - 1]);
  const r = ROADS[kind];
  return { id, a: na.id, b: nb.id, kind, district: d, lanes: r.lanes, width: r.width, pts, cum, length: cum[cum.length - 1], limit: r.limit };
}

function attach(g: RoadGraph, e: RoadEdge): RoadEdge {
  g.edges.push(e);
  g.nodes[e.a].edges.push(e.id);
  g.nodes[e.b].edges.push(e.id);
  return e;
}

function addNode(g: RoadGraph, x: number, z: number, d: DistrictId): RoadNode {
  const n: RoadNode = { id: g.nodes.length, x, z, district: d, edges: [], light: false, radius: 6 };
  g.nodes.push(n);
  return n;
}

/** Authored roads on top of the lattice: the Bay Bridge (deck arc), the two map exits, and the roofed tunnels. */
export function addSpines(g: RoadGraph, rnd: () => number, nearest: (x: number, z: number) => number): void {
  const a = g.nodes[nearest(BRIDGE_A.x, BRIDGE_A.z)], b = g.nodes[nearest(BRIDGE_B.x, BRIDGE_B.z)];
  const bridge = attach(g, makeEdge(g.edges.length, a, b, 'bridge', 'bay', 0, BRIDGE_STEPS));
  const ya = heightAt(a.x, a.z), yb = heightAt(b.x, b.z), n = bridge.cum.length;
  bridge.ys = new Float32Array(n);
  for (let k = 0; k < n; k++) { const t = k / (n - 1); bridge.ys[k] = ya + (yb - ya) * t + BRIDGE_RISE * Math.sin(Math.PI * t) ** 0.7; }
  const hillTop = g.nodes[nearest(0, 2944)], coastEnd = g.nodes[nearest(2944, -2560)];
  const mx = addNode(g, hillTop.x + (rnd() - 0.5) * 40, 3060, hillTop.district), cx = addNode(g, 3060, coastEnd.z - 60, coastEnd.district);
  attach(g, makeEdge(g.edges.length, hillTop, mx, 'hills', hillTop.district, 22, 8)).exit = 'mountain';
  attach(g, makeEdge(g.edges.length, coastEnd, cx, 'coast', coastEnd.district, -18, 8)).exit = 'coast';
  for (const e of g.edges) { // downtown underpass on the z = 0 avenue, light tunnel on the strip's z = 768 avenue
    const na = g.nodes[e.a], nb = g.nodes[e.b], mx2 = (na.x + nb.x) / 2;
    if (e.kind !== 'avenue' || na.z !== nb.z) continue;
    if ((na.z === 0 && Math.abs(mx2) < 640) || (na.z === 768 && mx2 > 1024 && mx2 < 1536)) e.tunnel = true;
  }
}

/** Order-independent FNV-style hash of nodes (rounded to cm) and edges (ends and kind). */
function graphHash(g: RoadGraph): number {
  let h = 0x811c9dc5;
  const mix = (v: number): void => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; };
  for (const n of g.nodes) { mix(Math.round(n.x * 100)); mix(Math.round(n.z * 100)); }
  for (const e of g.edges) { mix(e.a); mix(e.b); mix(e.kind.length * 31 + e.kind.charCodeAt(0)); mix(Math.round(e.length * 10)); }
  return h;
}

/** Sort each node's edges by bearing, size the junction patches, place traffic lights and hash the result. */
export function finishGraph(g: RoadGraph, roads: typeof ROADS): RoadGraph {
  for (const n of g.nodes) {
    const bearing = (id: number): number => {
      const e = g.edges[id], o = e.a === n.id ? g.nodes[e.b] : g.nodes[e.a];
      return Math.atan2(o.x - n.x, o.z - n.z);
    };
    n.edges.sort((p, q) => bearing(p) - bearing(q));
    let w = 8, big = 0;
    for (const id of n.edges) {
      const e = g.edges[id];
      w = Math.max(w, roads[e.kind].width);
      if (e.kind === 'avenue' || e.kind === 'highway') big++;
    }
    n.radius = w / 2 + 2.5;
    n.light = n.edges.length >= 3 && big >= 2;
  }
  g.hash = graphHash(g);
  return g;
}
