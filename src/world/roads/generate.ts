import { createRng } from '../../core/rng';
import type { DistrictId, RoadEdge, RoadGraph, RoadKind, RoadNode } from '../../types/world';
import { districtAt, GRAMMAR, isWater, LAT, LAT_N, RING, ROADS, WORLD_HALF } from './grammar';
import { addSpines, finishGraph, makeEdge, runwayEdge, runwayNode } from './spines';

/** District of a lattice node: the first land quadrant around it (nodes sit on district cell borders). */
function nodeDistrict(x: number, z: number): DistrictId | null {
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) if (!isWater(x + dx, z + dz)) return districtAt(x + dx, z + dz);
  return null;
}

/** A link is on land if either side of its midpoint is land (shore links run along the water's edge). */
function linkDistrict(ax: number, az: number, bx: number, bz: number): DistrictId | null {
  const mx = (ax + bx) / 2, mz = (az + bz) / 2, nx = -(bz - az), nz = bx - ax, l = Math.hypot(nx, nz) || 1;
  for (const s of [1, -1]) { const x = mx + (nx / l) * s, z = mz + (nz / l) * s; if (!isWater(x, z)) return districtAt(x, z); }
  return null;
}

const onRing = (ax: number, az: number, bx: number, bz: number): boolean =>
  (ax === bx && Math.abs(ax) === RING && Math.abs(az) <= RING && Math.abs(bz) <= RING) || (az === bz && Math.abs(az) === RING && Math.abs(ax) <= RING && Math.abs(bx) <= RING);

/**
 * Neon Harbor's road graph from a seed (docs/open-world.md): a 128 m lattice over the land, bent per district grammar
 * (jitter, bowed links, avenues every n-th line), the highway ring on lines +-2048, then authored spines (Bay Bridge,
 * runway, tunnels, exits). A seeded spanning tree (Kruskal over shuffled links) is always kept, so the city is one
 * connected network; only the other links may be dropped. Deterministic: the same seed gives the same city.
 */
export function generateRoads(seed = 7): RoadGraph {
  const rnd = createRng(seed);
  const nodes: RoadNode[] = [];
  const at = new Map<number, number>(); // lattice (i, j) -> node id
  const key = (i: number, j: number): number => (i + 64) * 256 + (j + 64);
  for (let i = -LAT_N; i <= LAT_N; i++) for (let j = -LAT_N; j <= LAT_N; j++) {
    const x0 = i * LAT, z0 = j * LAT, d = nodeDistrict(x0, z0);
    if (!d) continue;
    const fixed = Math.abs(x0) === RING || Math.abs(z0) === RING || Math.abs(i) === LAT_N || Math.abs(j) === LAT_N || runwayNode(x0, z0) || nodeDistrict(x0 + LAT, z0) === null || nodeDistrict(x0 - LAT, z0) === null || nodeDistrict(x0, z0 + LAT) === null || nodeDistrict(x0, z0 - LAT) === null;
    const jit = fixed ? 0 : GRAMMAR[d].jitter;
    at.set(key(i, j), nodes.length);
    nodes.push({ id: nodes.length, x: x0 + (rnd() - 0.5) * 2 * jit, z: z0 + (rnd() - 0.5) * 2 * jit, district: d, edges: [], light: false, radius: 6 });
  }
  // candidate links with their kind; `must` = never dropped (ring, avenues, runway)
  interface Cand { a: number; b: number; kind: RoadKind; d: DistrictId; bow: number; must: boolean; line: number }
  const cands: Cand[] = [];
  for (let i = -LAT_N; i <= LAT_N; i++) for (let j = -LAT_N; j <= LAT_N; j++) {
    const a = at.get(key(i, j));
    if (a === undefined) continue;
    for (const [di, dj] of [[1, 0], [0, 1]] as const) {
      const b = at.get(key(i + di, j + dj));
      if (b === undefined) continue;
      const ax = i * LAT, az = j * LAT, bx = (i + di) * LAT, bz = (j + dj) * LAT;
      const d = linkDistrict(ax, az, bx, bz);
      if (!d || d === 'bay') continue;
      const rw = runwayEdge(ax, az, bx, bz);
      if (rw === 'cross') continue; // nothing crosses the runway
      const g = GRAMMAR[d], line = di ? j : i; // the lattice line this link lies on
      const ring = onRing(ax, az, bx, bz);
      const avenue = g.avenueEvery > 0 && ((line % g.avenueEvery) + g.avenueEvery) % g.avenueEvery === 0;
      let kind: RoadKind = ring ? 'highway' : rw === 'on' ? 'runway' : avenue ? 'avenue' : g.minor;
      if (d === 'oldtown' && kind === 'alley' && rnd() < 0.45) kind = 'street';
      const bow = kind === g.minor ? (rnd() - 0.5) * 2 * g.curve : 0;
      cands.push({ a, b, kind, d, bow, must: ring || rw === 'on' || kind === 'avenue', line });
    }
  }
  // seeded spanning tree: shuffle, union-find; tree links are kept no matter what
  const order = cands.map((_, k) => k);
  for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)); [order[k], order[r]] = [order[r], order[k]]; }
  order.sort((p, q) => Number(cands[q].must) - Number(cands[p].must)); // must-keep links join first (stable)
  const parent = nodes.map((_, k) => k);
  const find = (x: number): number => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  const edges: RoadEdge[] = [];
  for (const k of order) {
    const c = cands[k], ra = find(c.a), rb = find(c.b), tree = ra !== rb;
    if (tree) parent[ra] = rb;
    if (!tree && !c.must && rnd() < GRAMMAR[c.d].drop) continue;
    const e = makeEdge(edges.length, nodes[c.a], nodes[c.b], c.kind, c.d, c.bow);
    if (c.kind === 'street' && c.d === 'downtown' && ((c.line % 2) + 2) % 2 === 1) e.oneWay = true; // alternating one-way grid
    edges.push(e);
    nodes[c.a].edges.push(e.id);
    nodes[c.b].edges.push(e.id);
  }
  edges.sort((p, q) => p.id - q.id);
  const g: RoadGraph = { seed, half: WORLD_HALF, nodes, edges };
  addSpines(g, rnd, (x, z) => { let best = -1, bd = Infinity; for (const n of nodes) { const dd = (n.x - x) ** 2 + (n.z - z) ** 2; if (dd < bd) { bd = dd; best = n.id; } } return best; });
  return finishGraph(g, ROADS);
}

/** Nodes reachable from node 0 (the spanning tree keeps the graph in one piece; tests assert it). */
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
