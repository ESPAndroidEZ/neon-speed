import type { RoadGraph } from '../types/world';

/**
 * GPS for Neon Harbor: the quickest way over the road graph (A*, cost = length / speed limit, one-way streets respected).
 * Pure; allocates per call (a route is asked for when the target changes, not every frame).
 */
export interface Route {
  /** Node ids from start to goal. */
  nodes: number[];
  /** Edge ids between them (nodes.length - 1). */
  edges: number[];
  /** Total length (m) and expected time at the limits (s). */
  length: number;
  seconds: number;
}

const VMAX = 40; // the fastest limit (runway): keeps the A* estimate admissible

/** Node nearest to (x, z) that has at least one road (linear scan: call on demand). */
export function nearestNode(g: RoadGraph, x: number, z: number): number {
  let best = -1, d = Infinity;
  for (const n of g.nodes) {
    if (n.edges.length === 0) continue;
    const k = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
    if (k < d) { d = k; best = n.id; }
  }
  return best;
}

/** Quickest route from node `from` to node `to`, or null when there is none. `skipEdge` / `skipNode` (1 = closed) shut roads off (city race loops). */
export function findRoute(g: RoadGraph, from: number, to: number, skipEdge?: Uint8Array, skipNode?: Uint8Array): Route | null {
  const n = g.nodes.length;
  const cost = new Float64Array(n).fill(Infinity), via = new Int32Array(n).fill(-1), done = new Uint8Array(n);
  const goal = g.nodes[to];
  const h = (i: number): number => Math.hypot(g.nodes[i].x - goal.x, g.nodes[i].z - goal.z) / VMAX;
  const heap: number[] = [], key: number[] = []; // binary heap of node ids by f = cost + h
  const push = (i: number, f: number): void => {
    heap.push(i); key.push(f);
    for (let c = heap.length - 1; c > 0;) {
      const p = (c - 1) >> 1;
      if (key[p] <= key[c]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]]; [key[p], key[c]] = [key[c], key[p]]; c = p;
    }
  };
  const pop = (): number => {
    const top = heap[0], lastI = heap.pop() as number, lastK = key.pop() as number;
    if (heap.length) {
      heap[0] = lastI; key[0] = lastK;
      for (let p = 0; ;) {
        const l = p * 2 + 1, r = l + 1;
        let m = p;
        if (l < heap.length && key[l] < key[m]) m = l;
        if (r < heap.length && key[r] < key[m]) m = r;
        if (m === p) break;
        [heap[p], heap[m]] = [heap[m], heap[p]]; [key[p], key[m]] = [key[m], key[p]]; p = m;
      }
    }
    return top;
  };
  cost[from] = 0;
  push(from, h(from));
  while (heap.length) {
    const u = pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u === to) break;
    for (const eid of g.nodes[u].edges) {
      const e = g.edges[eid];
      if (e.oneWay && e.a !== u) continue; // one-way: a -> b only
      const v = e.a === u ? e.b : e.a;
      if (skipEdge?.[eid] || (skipNode?.[v] && v !== to)) continue;
      const c =cost[u] + e.length / e.limit;
      if (c < cost[v]) { cost[v] = c; via[v] = eid; push(v, c + h(v)); }
    }
  }
  if (!Number.isFinite(cost[to])) return null;
  const nodes = [to], edges: number[] = [];
  let length = 0;
  for (let v = to; v !== from;) {
    const e = g.edges[via[v]];
    edges.push(e.id);
    length += e.length;
    v = e.a === v ? e.b : e.a;
    nodes.push(v);
  }
  nodes.reverse();
  edges.reverse();
  return { nodes, edges, length, seconds: cost[to] };
}
