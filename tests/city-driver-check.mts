import { driveRoutes } from './lab/city-driver.mts';
import { generateRoads } from '../src/world/roads/generate.ts';
import { findRoute } from '../src/core/route.ts';
import { cityPath, nearestIndex, progressIndex } from '../src/physics/cityDriver.ts';
import { OUTRUN } from '../src/game/roamOutrun.ts';

/* In-city outrun rival (physics/cityDriver): it reaches the end of real city routes at street-racing pace without
   hitting walls, its corner speeds are bounded, and progress tracking works. */
let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const civic = driveRoutes(10, 'civic'), supra = driveRoutes(10, 'supra');
check('a Civic rival finishes every route', civic.finished === civic.routes, `${civic.finished}/${civic.routes}${civic.worst}`);
check('a Supra rival finishes every route', supra.finished === supra.routes, `${supra.finished}/${supra.routes}${supra.worst}`);
check('street-racing pace (60-120 km/h average) and the faster car is faster', civic.avgKmh > 60 && supra.avgKmh < 120 && supra.avgKmh >= civic.avgKmh, `${civic.avgKmh.toFixed(0)} / ${supra.avgKmh.toFixed(0)} km/h`);
check('rarely hits walls (under 0.5 per km)', civic.hitsPerKm < 0.5 && supra.hitsPerKm < 0.5, `${civic.hitsPerKm.toFixed(2)} / ${supra.hitsPerKm.toFixed(2)}`);
const g = generateRoads(7), a = g.nodes.find((n) => n.edges.length >= 3)!, b = g.nodes.find((n) => n.edges.length >= 3 && Math.hypot(n.x - a.x, n.z - a.z) > 1000)!;
const rt = findRoute(g, a.id, b.id)!, p = cityPath(g, rt.nodes, rt.edges), wet = cityPath(g, rt.nodes, rt.edges, 0.72);
check('route points every ~4 m', p.s.length > rt.length / 5 && Math.abs(p.length - rt.length) < rt.length * 0.05, `${p.s.length} points, ${p.length.toFixed(0)} m`);
check('corner speeds bounded and lower in the wet', Math.max(...p.v) <= 62 && wet.v.every((v, i) => v <= p.v[i] + 1e-3), `max ${Math.max(...p.v).toFixed(1)} m/s`);
check('progress search follows the route forward', progressIndex(p, p.x[50], p.z[50], 40) === 50 && nearestIndex(p, p.x[p.x.length - 3], p.z[p.z.length - 3]) === p.x.length - 3);
check('outrun rules: win clear before the rival is clear, lengths sensible', OUTRUN.win < OUTRUN.lose && OUTRUN.minLen >= 800 && OUTRUN.maxLen <= 2500);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
