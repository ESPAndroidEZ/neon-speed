import type { RoadGraph } from '../types/world';
import { planDrag } from './cityDrag';
import { CITY_PREFIX, cityId, planLoop, placeCityRaces, type CityKind, type CityRace, type LoopKind } from './cityRace';

/**
 * Every city event (Underground round): the W5.5 circuits plus a sprint and a drift run per district (start rings), and
 * outruns planned on demand from a challenger's junction. Ids say how to rebuild each map (`planCityEvent`), so a saved
 * or restarted race finds its map without the city. Pure; allocates only when planning.
 */
const KINDS: readonly LoopKind[] = ['sprint', 'drift'];
/** Start rings of different events keep this far apart (m). */
const APART = 90;

export function placeCityEvents(g: RoadGraph): CityRace[] {
  const out = placeCityRaces(g);
  const ds = [...new Set(g.nodes.map((n) => n.district))];
  for (const kind of KINDS) for (const dist of ds) {
    const nodes = g.nodes.filter((n) => n.district === dist && n.edges.length >= 3 && out.every((r) => Math.hypot(r.x - n.x, r.z - n.z) > APART));
    if (!nodes.length) continue;
    const cx = nodes.reduce((a, n) => a + n.x, 0) / nodes.length, cz = nodes.reduce((a, n) => a + n.z, 0) / nodes.length;
    // sprints start nearer the middle, drift runs a little further out (the order picks different junctions)
    nodes.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
    for (let i = kind === 'drift' ? 3 : 0; i < Math.min(16, nodes.length); i++) {
      const r = planLoop(g, nodes[i].id, cityId(kind, dist), dist, kind);
      if (r) { out.push(r); break; }
    }
  }
  const drag = planDrag(g);
  if (drag) out.push(drag);
  return out;
}

/** An outrun from the junction nearest (x, z): one run to the far side of a loop, against one challenger. */
export function planOutrun(g: RoadGraph, node: number): CityRace | null {
  const n = g.nodes[node];
  return n ? planLoop(g, node, cityId('run', String(node)), n.district, 'run') : null;
}

const cache = new Map<string, CityRace | null>();
/** Rebuild a city event from its id (null when the id is not one). Cached per id. */
export function planCityEvent(g: RoadGraph, id: string, placed?: readonly CityRace[]): CityRace | null {
  if (!id.startsWith(CITY_PREFIX)) return null;
  const hit = placed?.find((r) => r.id === id);
  if (hit) return hit;
  if (cache.has(id)) return cache.get(id) ?? null;
  const rest = id.slice(CITY_PREFIX.length), dash = rest.indexOf('-');
  const kind = dash > 0 ? (rest.slice(0, dash) as CityKind) : 'circuit';
  let r: CityRace | null = null;
  if (kind === 'run') r = planOutrun(g, Number(rest.slice(dash + 1)));
  else r = (placed ?? placeCityEvents(g)).find((e) => e.id === id) ?? null;
  cache.set(id, r);
  return r;
}

export const kindOf = (id: string): CityKind => { const rest = id.slice(CITY_PREFIX.length), d = rest.indexOf('-'); return d > 0 ? (rest.slice(0, d) as CityKind) : 'circuit'; };
