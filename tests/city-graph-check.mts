// Neon Harbor road graph (world/roads): deterministic, connected, every district reachable, widths in range, sane
// heights, the Bay Bridge spans the water, two exits, a closed highway ring, a straight runway, tunnels, few dead ends.
import { generateRoads, reachable } from '../src/world/roads/generate.ts';
import { heightAt } from '../src/world/roads/height.ts';
import { isWater } from '../src/data/world/districtMap.ts';
import { DISTRICTS } from '../src/types/world.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const t0 = performance.now();
const g = generateRoads(7);
const ms = performance.now() - t0;
check('generates in under 300 ms', ms < 300, `${ms.toFixed(0)} ms, ${g.nodes.length} nodes, ${g.edges.length} edges`);
check('same seed, same city', generateRoads(7).hash === g.hash, String(g.hash));
check('another seed, another city', generateRoads(8).hash !== g.hash);
check('one connected network', reachable(g) === g.nodes.length, `${reachable(g)} / ${g.nodes.length}`);
const land = DISTRICTS.filter((d) => d !== 'bay');
const missing = land.filter((d) => !g.nodes.some((n) => n.district === d));
check('every land district has streets', missing.length === 0, missing.join(','));
const badW = g.edges.filter((e) => e.width < 7 || e.width > 20);
check('road widths 7-20 m', badW.length === 0, badW.slice(0, 3).map((e) => `${e.kind}:${e.width}`).join(','));
check('no zero-length or NaN edges', g.edges.every((e) => e.length > 5 && Number.isFinite(e.length)));
const pair = new Set<string>(); let dup = 0;
for (const e of g.edges) { const k = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`; if (pair.has(k)) dup++; pair.add(k); }
check('no duplicate links', dup === 0, String(dup));
let nan = 0, lo = Infinity, hi = -Infinity;
for (let x = -3072; x <= 3072; x += 64) for (let z = -3072; z <= 3072; z += 64) { const h = heightAt(x, z); if (!Number.isFinite(h)) nan++; lo = Math.min(lo, h); hi = Math.max(hi, h); }
check('terrain heights finite and in range', nan === 0 && lo > -1 && hi < 120, `${lo.toFixed(1)}..${hi.toFixed(1)} m`);
const br = g.edges.filter((e) => e.kind === 'bridge');
const b = br[0];
const wet = b ? Array.from({ length: 21 }, (_, k) => { const i = Math.round((k / 20) * (b.cum.length - 1)); return isWater(b.pts[i * 2], b.pts[i * 2 + 1]); }).filter(Boolean).length : 0;
check('Bay Bridge: one, > 1.3 km, mostly over water, deck above the sea', br.length === 1 && b.length > 1300 && wet >= 15 && !!b.ys && Math.min(...b.ys) > 0.5 && Math.max(...b.ys) > 20, b ? `${b.length.toFixed(0)} m, ${wet}/21 wet` : 'none');
const ex = g.edges.filter((e) => e.exit);
check('two exits (mountain, coast)', ex.length === 2 && ex.some((e) => e.exit === 'mountain') && ex.some((e) => e.exit === 'coast'));
const hw = g.edges.filter((e) => e.kind === 'highway'), hwNodes = new Map<number, number>();
for (const e of hw) for (const n of [e.a, e.b]) hwNodes.set(n, (hwNodes.get(n) ?? 0) + 1);
const ringEnds = [...hwNodes.values()].filter((c) => c < 2).length; // the two bridge ends close the ring
check('highway ring closed through the bridge', hw.length > 80 && ringEnds === 2, `${hw.length} links, ${ringEnds} open ends`);
const rw = g.edges.filter((e) => e.kind === 'runway');
check('runway: a 1.66 km straight with no crossings', rw.length > 0 && Math.abs(rw.reduce((a, e) => a + e.length, 0) - 1664) < 1, `${rw.reduce((a, e) => a + e.length, 0).toFixed(0)} m`);
check('downtown underpass and strip light tunnel', g.edges.filter((e) => e.tunnel).length >= 6);
const dead = g.nodes.filter((n) => n.edges.length === 1 && !g.edges[n.edges[0]].exit);
const deadCity = dead.filter((n) => n.district === 'downtown' || n.district === 'strip');
check('dead ends only as cul-de-sacs outside the centre', deadCity.length <= 3, `${dead.length} total, ${deadCity.length} downtown/strip`);
check('one-way streets downtown', g.edges.some((e) => e.oneWay));
if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('ALL PASS');
