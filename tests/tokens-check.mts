/* Neon tokens (core/tokens.ts): deterministic, on core streets, spaced, picked up once, rewards ordered. */
import { generateRoads } from '../src/world/roads/generate.ts';
import { placeTokens, TokenWatch, TOKEN_REWARDS, TOKEN_COUNT, CORE_DISTRICTS } from '../src/core/tokens.ts';
import { RoadIndex, createRoadHit } from '../src/world/roads/roadIndex.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), a = placeTokens(g), b = placeTokens(g);
check('same graph, same tokens', JSON.stringify(a) === JSON.stringify(b));
check(`${TOKEN_COUNT} tokens placed`, a.length === TOKEN_COUNT, String(a.length));
let near = Infinity, off = 0, core = 0;
const idx = new RoadIndex(g), hit = createRoadHit();
for (let i = 0; i < a.length; i++) {
  for (let j = i + 1; j < a.length; j++) near = Math.min(near, Math.hypot(a[i].x - a[j].x, a[i].z - a[j].z));
  const h = idx.nearest(a[i].x, a[i].z, hit);
  if (h.edge < 0 || h.dist > g.edges[h.edge].width / 2) off++;
  if (h.edge >= 0 && (CORE_DISTRICTS as readonly string[]).includes(g.edges[h.edge].district)) core++;
}
check('at least 110 m apart', near >= 110, near.toFixed(0));
check('every token is on the tarmac', off === 0, String(off));
check('every token sits in a core district', core === a.length, `${core}/${a.length}`);
const w = new TokenWatch(a);
check('nothing picked up far away', w.step(1e5, 1e5) === -1);
check('standing on a token picks it up', w.step(a[3].x, a[3].z) === 3 && w.count === 1);
check('it is picked up only once', w.step(a[3].x, a[3].z) === -1 && w.count === 1);
check('nearest skips collected', w.nearest(a[3].x, a[3].z) !== 3);
check('restored ids are kept', new TokenWatch(a, [1, 2, 2, 99]).count === 2);
check('rewards rise and end at the total', TOKEN_REWARDS.every((r, i) => i === 0 || r.n > TOKEN_REWARDS[i - 1].n) && TOKEN_REWARDS[TOKEN_REWARDS.length - 1].n === TOKEN_COUNT);
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
