/* GPS (core/route.ts): routes exist between every pair of districts, are connected chains, respect one-way streets,
 * are never slower than a plain Dijkstra (A* is exact), and are fast enough to recompute when the player leaves the route. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { findRoute, nearestNode } from '../src/core/route.ts';
import { DISTRICTS } from '../src/types/world.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7);
const centre = (d: string): number => { const ns = g.nodes.filter((n) => n.district === d && n.edges.length); return nearestNode(g, ns.reduce((a, n) => a + n.x, 0) / ns.length, ns.reduce((a, n) => a + n.z, 0) / ns.length); };
const land = DISTRICTS.filter((d) => d !== 'bay');
let missing = 0, broken = 0, wrongWay = 0, worstMs = 0;
for (const a of land) for (const b of land) {
  if (a === b) continue;
  const t0 = performance.now();
  const r = findRoute(g, centre(a), centre(b));
  worstMs = Math.max(worstMs, performance.now() - t0);
  if (!r) { missing++; continue; }
  for (let i = 0; i < r.edges.length; i++) {
    const e = g.edges[r.edges[i]], u = r.nodes[i], v = r.nodes[i + 1];
    if (!((e.a === u && e.b === v) || (e.b === u && e.a === v))) broken++;
    if (e.oneWay && e.a !== u) wrongWay++;
  }
}
check('a route between every pair of districts', missing === 0, `${missing} missing`);
check('routes are connected chains of edges', broken === 0);
check('one-way streets only driven a -> b', wrongWay === 0);
check('fast: under 25 ms for the longest route', worstMs < 25, `${worstMs.toFixed(1)} ms`);
// exactness: compare with a plain Dijkstra on 20 random pairs
const dijkstra = (from: number, to: number): number => {
  const d = new Float64Array(g.nodes.length).fill(Infinity), seen = new Uint8Array(g.nodes.length); d[from] = 0;
  for (;;) { let u = -1; for (let i = 0; i < d.length; i++) if (!seen[i] && (u < 0 || d[i] < d[u])) u = i; if (u < 0 || !Number.isFinite(d[u]) || u === to) break; seen[u] = 1;
    for (const id of g.nodes[u].edges) { const e = g.edges[id]; if (e.oneWay && e.a !== u) continue; const v = e.a === u ? e.b : e.a; d[v] = Math.min(d[v], d[u] + e.length / e.limit); } }
  return d[to];
};
let worse = 0;
for (let k = 0; k < 20; k++) {
  const a = g.nodes[(k * 7919) % g.nodes.length].id, b = g.nodes[(k * 104729 + 13) % g.nodes.length].id;
  const r = findRoute(g, a, b), ref = dijkstra(a, b);
  if ((r ? r.seconds : Infinity) > ref + 1e-6) worse++;
}
check('A* is exact (never slower than Dijkstra on 20 pairs)', worse === 0, String(worse));
const r = findRoute(g, centre('downtown'), centre('hills'))!;
check('a cross-town route has a sensible length and time', r.length > 1000 && r.seconds > 30 && r.seconds < 600, `${(r.length / 1000).toFixed(1)} km, ${r.seconds.toFixed(0)} s`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
