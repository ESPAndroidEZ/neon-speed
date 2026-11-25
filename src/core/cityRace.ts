import type { DistrictId, RoadGraph } from '../types/world';
import type { TrackDef } from '../data/tracks/types';
import type { Vertex } from '../world/streetPath';
import { buildTrack } from '../data/tracks';
import { validateTrack } from '../world/trackValidate';
import { findRoute } from './route';

/**
 * City races in Free Drive (W5.5, docs/open-world.md): a GPS loop over Neon Harbor's road graph becomes a temporary
 * circuit map (TrackDef) that the normal race code runs, so AI, rubber band, results and cash (`claimRace`) are reused.
 * The loop goes out to a junction a few blocks away by the quickest way and comes back by other streets. Pure; allocates
 * (planned once per spot when the city is built, not per frame).
 */
export interface CityRace {
  /** Map id (`city-<district>`), also the key of the player's best time. */
  id: string;
  district: DistrictId;
  /** Start marker in city coordinates (a junction) and the way the car faces there. */
  x: number;
  z: number;
  heading: number;
  /** The circuit, centred on 0,0 (the race world is built around the origin). */
  def: TrackDef;
  /** Lap length (m), and where the map's origin sits in the city (map point + offset = city point). */
  length: number;
  ox: number;
  oz: number;
  /** Road-graph edges of the loop in driving order (GPS line on the map). */
  edges: number[];
  /** Event type (Underground round): circuit laps, sprint (one run to the far side), drift (score), run (outrun vs one challenger). */
  kind: CityKind;
  /** Finish line in city coordinates (the start line for circuits and drift). */
  fx: number;
  fz: number;
}
export type CityKind = 'circuit' | 'sprint' | 'drift' | 'run' | 'drag';
/** Kinds planned as a GPS loop (the drag strip is its own map, core/cityDrag). */
export type LoopKind = Exclude<CityKind, 'drag'>;
/** Map id per kind: `city-<district>` circuits (W5.5), `city-sprint-<district>`, `city-drift-<district>`, `city-run-<node>`. */
export const cityId = (kind: CityKind, key: string): string => CITY_PREFIX + (kind === 'circuit' ? '' : `${kind}-`) + key;

export const CITY_PREFIX = 'city-';
export const isCityTrack = (id: string): boolean => id.startsWith(CITY_PREFIX);

const NAMES: Record<DistrictId, string> = { downtown: 'Downtown Loop', harbour: 'Harbour Loop', oldtown: 'Old Town Loop', strip: 'Strip Loop', hills: 'Hills Loop', industrial: 'Industrial Loop', bay: 'Bay Loop' };
const SUFFIX: Record<LoopKind, string> = { circuit: ' Loop', sprint: ' Sprint', drift: ' Drift', run: ' Outrun' };
const nameOf = (d: DistrictId, k: LoopKind): string => NAMES[d].replace(' Loop', SUFFIX[k]);
const BLURB = 'A street race through Neon Harbor, picked from the GPS.';
/** Every player-visible text of the city maps (tests/lab/i18n-harvest.mts checks the Spanish). */
export const CITY_TEXT: readonly string[] = [...(Object.keys(NAMES) as DistrictId[]).flatMap((d) => (Object.keys(SUFFIX) as LoopKind[]).map((k) => nameOf(d, k))), ...Object.values(NAMES).map((n) => n.replace(' Loop', '')), BLURB, 'Runway Drag', 'Runway', 'A straight line on the old runway: launch, shift on time, hold it flat.'];
/** Sprints and outruns end this far round the loop (the far side; the rest is the way back). */
const SPRINT_END = 0.56;
const FAST: ReadonlySet<string> = new Set(['highway', 'runway', 'bridge']); // no races over the motorway or the airport
const LAPS = 2;
const MIN_LEN = 1000, MAX_LEN = 2800;
/** Ways to the turn-around junction, in blocks of about 128 m (tried in order). */
const REACH: readonly [number, number][] = [[3, 2], [2, 3], [-3, 2], [3, -2], [-2, -3], [4, 1], [1, 4], [-4, -1], [2, 2], [-2, 2]];

/** Point list of the closed loop (edge centre lines in driving order, junction points once). */
function loopPoints(g: RoadGraph, nodes: number[], edges: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = g.edges[edges[i]], fwd = e.a === nodes[i], m = e.pts.length / 2;
    for (let k = 0; k < m - 1; k++) {
      const j = fwd ? k : m - 1 - k, x = e.pts[j * 2], z = e.pts[j * 2 + 1], l = out[out.length - 1];
      if (!l || Math.hypot(x - l[0], z - l[1]) > 1) out.push([x, z]);
    }
  }
  return out;
}

/** Douglas-Peucker on an open polyline: indices of the points to keep. */
function simplify(p: [number, number][], tol: number): [number, number][] {
  const keep = new Uint8Array(p.length);
  keep[0] = keep[p.length - 1] = 1;
  const stack: [number, number][] = [[0, p.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const ax = p[a][0], az = p[a][1], dx = p[b][0] - ax, dz = p[b][1] - az, L = Math.hypot(dx, dz) || 1;
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i][0] - ax) * dz - (p[i][1] - az) * dx) / L; if (d > worst) { worst = d; at = i; } }
    if (worst > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return p.filter((_, i) => keep[i] === 1);
}

/** Drop corners whose fillet cannot fit (short legs on winding hill roads): the race map smooths them over. */
function prune(p: [number, number][], w: number): [number, number][] {
  const need = w / 2 + 6;
  for (let pass = 0; pass < 400 && p.length > 4; pass++) {
    let worst = -1, ws = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length], c = p[i], b = p[(i + 1) % p.length];
      const l = Math.min(Math.hypot(c[0] - a[0], c[1] - a[1]), Math.hypot(b[0] - c[0], b[1] - c[1]));
      const turn = Math.abs(Math.atan2((c[0] - a[0]) * (b[1] - c[1]) - (c[1] - a[1]) * (b[0] - c[0]), (c[0] - a[0]) * (b[0] - c[0]) + (c[1] - a[1]) * (b[1] - c[1])));
      const short = need * Math.tan(turn / 2) - 0.48 * l; // > 0: the fillet does not fit
      if (short > ws) { ws = short; worst = i; }
    }
    if (worst < 0) break;
    p.splice(worst, 1);
  }
  return p;
}

/** Corners with fillets that fit the legs (race roads a little wider than the city's, corners as in the race maps). */
function corners(p: [number, number][], w: number): Vertex[] {
  const n = p.length;
  return p.map((c, i) => {
    const a = p[(i + n - 1) % n], b = p[(i + 1) % n];
    const l1 = Math.hypot(c[0] - a[0], c[1] - a[1]), l2 = Math.hypot(b[0] - c[0], b[1] - c[1]);
    const h1 = Math.atan2(c[0] - a[0], c[1] - a[1]), h2 = Math.atan2(b[0] - c[0], b[1] - c[1]);
    const turn = Math.abs(Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)));
    const fit = turn > 1e-3 ? (0.48 * Math.min(l1, l2)) / Math.tan(turn / 2) : 0;
    const r = Math.min(fit, Math.max(w / 2 + 12, turn < 0.6 ? 60 : 0)); // pruned corners always fit w / 2 + 6
    return { x: c[0], z: c[1], r: Math.max(0, r), zone: 'street', w };
  });
}

/** The circuit for one loop of nodes/edges, or null when it fails the race-map rules. */
function toTrack(g: RoadGraph, id: string, district: DistrictId, nodes: number[], edges: number[], kind: LoopKind): { def: TrackDef; length: number; ox: number; oz: number; fx: number; fz: number } | null {
  const pts = loopPoints(g, nodes, edges);
  if (pts.length < 4) return null;
  let far = 0; // a closed loop is simplified as two halves (start -> farthest point -> start)
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]) > Math.hypot(pts[far][0] - pts[0][0], pts[far][1] - pts[0][1])) far = i;
  const s = [...simplify(pts.slice(0, far + 1), 2.5), ...simplify([...pts.slice(far), pts[0]], 2.5).slice(1, -1)];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const q of s) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
  const ox = (x0 + x1) / 2, oz = (z0 + z1) / 2;
  const w = Math.max(12, Math.min(16, Math.min(...edges.map((e) => g.edges[e].width)) + 1));
  const vs = corners(prune(s.map((q) => [q[0] - ox, q[1] - oz] as [number, number]), w), w);
  // start on the longest leg, 70 % along it (the grid sits behind the line)
  let best = 0, bl = 0;
  for (let i = 0; i < vs.length; i++) { const b = vs[(i + 1) % vs.length], l = Math.hypot(b.x - vs[i].x, b.z - vs[i].z); if (l > bl) { bl = l; best = i; } }
  const a = vs[best], b = vs[(best + 1) % vs.length];
  const def: TrackDef = {
    id, name: nameOf(district, kind), district: NAMES[district].replace(' Loop', ''), blurb: BLURB,
    theme: district === 'harbour' || district === 'industrial' ? 'port' : 'city', type: kind === 'run' ? 'sprint' : kind, vertices: vs,
    start: [a.x + (b.x - a.x) * 0.7, a.z + (b.z - a.z) * 0.7], laps: kind === 'sprint' || kind === 'run' ? 1 : LAPS, propsDensity: 0.6, defaultWeather: 'CLEAR', recommendedWeather: ['CLEAR', 'RAIN'],
  };
  const sprint = def.type === 'sprint';
  if (sprint) def.sprintEnd = SPRINT_END;
  const tr = buildTrack(def);
  if (tr.samples.length < 10) return null; // degenerate polygon (a leg of zero length)
  if (kind === 'drift') def.driftTarget = Math.round((tr.length * LAPS * 1.2) / 100) * 100; // 1.2 pts per m: bots that do not try score 400-3200 (tests/lab/city-drift.mts)
  const f = tr.samples[sprint ? tr.raceSamples : 0].position;
  return validateTrack(tr, { minLength: MIN_LEN, maxLength: MAX_LEN, sprint }).length ? null : { def, length: tr.length, ox, oz, fx: f.x + ox, fz: f.z + oz };
}

/** A loop that starts and ends at node `s`, or null. */
export function planLoop(g: RoadGraph, s: number, id: string, district: DistrictId, kind: LoopKind = 'circuit', reach: readonly [number, number][] = REACH): CityRace | null {
  const skipE = new Uint8Array(g.edges.length);
  for (const e of g.edges) if (FAST.has(e.kind)) skipE[e.id] = 1;
  const n0 = g.nodes[s];
  for (const [bx, bz] of reach) {
    let t = -1, d = Infinity;
    for (const n of g.nodes) {
      if (n.edges.length < 2 || n.district !== district) continue;
      const k = Math.hypot(n.x - (n0.x + bx * 128), n.z - (n0.z + bz * 128));
      if (k < d) { d = k; t = n.id; }
    }
    if (t < 0 || t === s || d > 140) continue;
    const out = findRoute(g, s, t, skipE);
    if (!out) continue;
    const e2 = skipE.slice(), n2 = new Uint8Array(g.nodes.length);
    for (const e of out.edges) e2[e] = 1;
    for (const v of out.nodes) n2[v] = 1; // no street or junction twice: the loop must not cross itself
    const back = findRoute(g, t, s, e2, n2);
    if (!back) continue;
    const nodes = [...out.nodes, ...back.nodes.slice(1)], edges = [...out.edges, ...back.edges];
    const tr = toTrack(g, id, district, nodes, edges, kind);
    if (!tr) continue;
    const e = g.edges[edges[0]], fwd = e.a === s, k = fwd ? 1 : e.pts.length / 2 - 2;
    const heading = Math.atan2(e.pts[k * 2] - n0.x, e.pts[k * 2 + 1] - n0.z);
    return { id, district, x: n0.x, z: n0.z, heading, def: tr.def, length: tr.length, ox: tr.ox, oz: tr.oz, edges, kind, fx: tr.fx, fz: tr.fz };
  }
  return null;
}

/** One city race per district (the junction nearest the middle of its streets that gives a valid loop). */
export function placeCityRaces(g: RoadGraph): CityRace[] {
  const out: CityRace[] = [];
  const ds = new Set(g.nodes.map((n) => n.district));
  for (const dist of ds) {
    const nodes = g.nodes.filter((n) => n.district === dist && n.edges.length >= 3);
    if (!nodes.length) continue;
    const cx = nodes.reduce((a, n) => a + n.x, 0) / nodes.length, cz = nodes.reduce((a, n) => a + n.z, 0) / nodes.length;
    nodes.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
    for (let i = 0; i < Math.min(12, nodes.length); i++) {
      const r = planLoop(g, nodes[i].id, cityId('circuit', dist), dist);
      if (r) { out.push(r); break; }
    }
  }
  return out;
}
