import { createRng } from '../../core/rng';
import type { RoadEdge, RoadGraph, RoadKind, RoadNode } from '../../types/world';
import { districtAt, GRAMMAR, ROADS, WORLD_HALF, XS, ZS } from './grammar';

const CURVE_STEPS = 6;

function polyline(ax: number, az: number, bx: number, bz: number, bow: number): Float32Array {
  if (Math.abs(bow) < 0.5) return new Float32Array([ax, az, bx, bz]);
  const len = Math.hypot(bx - ax, bz - az);
  const cx = (ax + bx) / 2 - ((bz - az) / len) * bow * 2;
  const cz = (az + bz) / 2 + ((bx - ax) / len) * bow * 2;
  const p = new Float32Array((CURVE_STEPS + 1) * 2);
  for (let i = 0; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    p[i * 2] = u * u * ax + 2 * u * t * cx + t * t * bx;
    p[i * 2 + 1] = u * u * az + 2 * u * t * cz + t * t * bz;
  }
  return p;
}

/**
 * Build the road graph for the slice from a seed. One lattice (XS x ZS) is shared by all districts so they join
 * cleanly; each district's grammar then jitters the junctions, bows and drops links and picks the road kind.
 * Deterministic: the same seed gives the same city.
 */
export function generateRoads(seed = 7): RoadGraph {
  const rnd = createRng(seed);
  const nodes: RoadNode[] = [];
  const at: number[][] = [];
  XS.forEach((x0, i) => {
    at.push([]);
    ZS.forEach((z0, j) => {
      const d = districtAt(x0, z0);
      const edge = i === 0 || j === 0 || i === XS.length - 1 || j === ZS.length - 1;
      const g = GRAMMAR[d];
      const jit = edge && d !== 'coast' ? 0 : g.jitter;
      at[i].push(nodes.length);
      nodes.push({ id: nodes.length, x: x0 + (rnd() - 0.5) * 2 * jit, z: z0 + (rnd() - 0.5) * 2 * jit, district: d, edges: [], light: false, radius: 6 });
    });
  });
  const edges: RoadEdge[] = [];
  const link = (a: number, b: number, line: number, onRing: boolean, harborRoad = false): void => {
    const na = nodes[a];
    const nb = nodes[b];
    const d = districtAt((na.x + nb.x) / 2, (na.z + nb.z) / 2);
    const g = GRAMMAR[d];
    const major = harborRoad || (g.avenueEvery > 0 && line % g.avenueEvery === g.avenueEvery - 1);
    let kind: RoadKind = d === 'coast' ? 'coast' : major ? 'avenue' : g.minor;
    if (d === 'oldtown' && rnd() < 0.45) kind = 'street';
    const keepRoll = rnd();
    const bow = (rnd() - 0.5) * 2 * g.curve;
    if (!major && !onRing && d !== 'coast' && keepRoll < g.drop) return;
    const pts = polyline(na.x, na.z, nb.x, nb.z, bow);
    const cum = new Float32Array(pts.length / 2);
    for (let k = 1; k < cum.length; k++) cum[k] = cum[k - 1] + Math.hypot(pts[k * 2] - pts[k * 2 - 2], pts[k * 2 + 1] - pts[k * 2 - 1]);
    const r = ROADS[kind];
    const e: RoadEdge = { id: edges.length, a, b, kind, district: d, lanes: r.lanes, width: r.width, pts, cum, length: cum[cum.length - 1], limit: r.limit };
    edges.push(e);
    na.edges.push(e.id);
    nb.edges.push(e.id);
  };
  for (let i = 0; i < XS.length; i++) for (let j = 0; j < ZS.length; j++) {
    const ring = (k: number, n: number): boolean => k === 0 || k === n - 1;
    if (i + 1 < XS.length) link(at[i][j], at[i + 1][j], j, ring(j, ZS.length), j === 3); // along X: belongs to Z line j (line 3 is Harbor Road)
    if (j + 1 < ZS.length) link(at[i][j], at[i][j + 1], i, ring(i, XS.length));
  }
  for (const n of nodes) {
    const bearing = (id: number): number => {
      const e = edges[id];
      const o = e.a === n.id ? nodes[e.b] : nodes[e.a];
      return Math.atan2(o.x - n.x, o.z - n.z);
    };
    n.edges.sort((p, q) => bearing(p) - bearing(q));
    let w = 8;
    let avenues = 0;
    for (const id of n.edges) {
      w = Math.max(w, edges[id].width);
      if (edges[id].kind === 'avenue') avenues++;
    }
    n.radius = w / 2 + 2.5;
    n.light = n.edges.length >= 3 && avenues >= 2 && n.district !== 'coast';
  }
  return { seed, half: WORLD_HALF, nodes, edges };
}

/** Nodes reachable from node 0 (the lattice ring keeps the graph in one piece; tests assert it). */
export function reachable(g: RoadGraph): number {
  const seen = new Uint8Array(g.nodes.length);
  const stack = [0];
  seen[0] = 1;
  let n = 0;
  while (stack.length) {
    const id = stack.pop()!;
    n++;
    for (const e of g.nodes[id].edges) {
      const o = g.edges[e].a === id ? g.edges[e].b : g.edges[e].a;
      if (!seen[o]) { seen[o] = 1; stack.push(o); }
    }
  }
  return n;
}
