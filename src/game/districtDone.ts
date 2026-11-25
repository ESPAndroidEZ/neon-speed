import type { DistrictId } from '../types/world';
import { districtAt } from '../data/world/districtMap';
import type { RoamActivities } from './roamActivities';
import type { RoamStory } from './roamStory';
import { FLOW_HOOK } from './roamFlow';

/**
 * How much of a district is done, 0..100: its neon tokens taken, its story places finished (state 2), its ring events
 * won (circuit, sprint, drift: `win:<map id>`) and its shops visited (`shop:<kind>`). Speed cameras and drift zones are
 * not counted (they repeat). Nothing in a district counts as 0.
 */
export function districtPct(a: RoamActivities, s: RoamStory, d: DistrictId): number {
  let total = 0, done = 0;
  const tk = a.tokens;
  for (let i = 0; i < tk.tokens.length; i++) if (districtAt(tk.tokens[i].x, tk.tokens[i].z) === d) { total++; if (tk.got[i]) done++; }
  for (let i = 0; i < s.pins.length; i++) if (districtAt(s.pins[i].x, s.pins[i].z) === d) { total++; if (s.states[i] === 2) done++; }
  for (const r of a.races.races) if (r.district === d) { total++; if (FLOW_HOOK.done(`win:${r.id}`)) done++; }
  for (const sh of a.flow.shops) if (sh.district === d) { total++; if (FLOW_HOOK.done(`shop:${sh.kind}`)) done++; }
  return total ? Math.round((done / total) * 100) : 0;
}
