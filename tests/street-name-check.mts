/* Task 066 place names (data/world/districtText.ts + core/streetName.ts): every road has a name, a grid street keeps
 * its name block after block, east-west and north-south streets never share a name, names are unique per list, the
 * cross-district roads have their own names, and every district has a short line. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { streetName } from '../src/core/streetName.ts';
import { DISTRICT_BLURB, STREET_NAMES } from '../src/data/world/districtText.ts';
import { DISTRICTS } from '../src/types/world.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7);
const names = g.edges.map((e) => streetName(g, e.id));
check('every road has a name', names.every((n) => typeof n === 'string' && n.length > 2), `${new Set(names).size} different names`);
const flat = Object.values(STREET_NAMES).flat();
check('no name twice in the lists', new Set(flat).size === flat.length, `${flat.length} names`);
check('every land district has 12 names, a line under 110 characters', DISTRICTS.every((d) => (d === 'bay' || STREET_NAMES[d].length === 12) && DISTRICT_BLURB[d].length > 20 && DISTRICT_BLURB[d].length <= 110));
// a grid row: east-west edges whose ends share z (same row) in one district keep one name
const rows = new Map<string, Set<string>>();
let ewNs = 0;
for (const e of g.edges) {
  if (e.district === 'hills' || !['street', 'avenue', 'alley'].includes(e.kind)) continue;
  const a = g.nodes[e.a], b = g.nodes[e.b], ew = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z);
  const key = `${e.district}:${ew ? 'h' : 'v'}:${Math.round((ew ? (a.z + b.z) / 2 : (a.x + b.x) / 2) / 128)}`;
  (rows.get(key) ?? rows.set(key, new Set()).get(key)!).add(names[e.id]);
  const half = STREET_NAMES[e.district].length >> 1, at = STREET_NAMES[e.district].indexOf(names[e.id]);
  if (ew !== at < half) ewNs++;
}
const split = [...rows.values()].filter((s) => s.size > 1).length;
check('a grid street keeps its name block after block', split === 0 && rows.size > 50, `${rows.size} rows/columns, ${split} with two names`);
check('east-west and north-south streets use different names', ewNs === 0, `${ewNs}`);
const special = g.edges.filter((e) => e.kind === 'highway' || e.kind === 'bridge').map((e) => names[e.id]);
check('motorway and bridge have their own names', special.length > 0 && special.every((n) => n === 'Harbor Expressway' || n === 'Bay Bridge'), [...new Set(special)].join(', '));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
