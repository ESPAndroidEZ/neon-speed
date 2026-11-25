import type { RoamActivities } from './roamActivities';
import type { Marker, MarkerKind } from '../ui/roamFullMap';
import type { RoamStory } from './roamStory';
import type { CityKind } from '../core/cityRace';
import { CHALLENGERS } from './roamFlow';
import { AREA_REP } from '../core/areaLocks';
import { t } from '../i18n';

const KIND_MARK: Record<CityKind, MarkerKind> = { circuit: 'race', sprint: 'sprint', drift: 'drift', run: 'run' };
const TOKEN_SEEN = 300; // m: a neon token shows on the map only when you are this close (finding them is the game)
const STORY: readonly MarkerKind[] = ['storyLock', 'story', 'storyDone'];

/** The full map's markers (race rings, drift zones, speed cameras, car meet, tokens not yet taken). Objects are reused. */
export function roamMarkers(a: RoamActivities, s: RoamStory, at: () => { x: number; z: number }): () => readonly Marker[] {
  const out: Marker[] = [];
  let n = 0;
  const add = (x: number, z: number, k: Marker['k'], label = ''): void => {
    const m = out[n] ?? (out[n] = { x: 0, z: 0, k, label });
    m.x = x; m.z = z; m.k = k; m.label = label; n++;
  };
  return () => {
    n = 0;
    for (let i = 0; i < s.pins.length; i++) add(s.pins[i].x, s.pins[i].z, STORY[s.states[i]], s.labels[i]);
    for (const r of a.races.races) add(r.x, r.z, KIND_MARK[r.kind]);
    const f = a.flow, me = at();
    for (const sh of f.shops) add(sh.x, sh.z, sh.kind);
    for (let k = 0; k < CHALLENGERS.length; k++) { const c = f.challenger(k, me); if (c) add(c.x, c.z, 'challenger'); }
    for (const c of f.centres) if (!f.open(c.id)) add(c.x, c.z, 'lock', t('area.lv', { n: AREA_REP[c.id] }));
    for (const z of a.zones) add(z.x, z.z, 'zone');
    for (const p of a.traps) add(p.x, p.z, 'trap');
    if (a.meetSpot) add(a.meetSpot.x, a.meetSpot.z, 'meet');
    for (let i = 0; i < a.tokens.tokens.length; i++) if (!a.tokens.got[i] && Math.hypot(a.tokens.tokens[i].x - at().x, a.tokens.tokens[i].z - at().z) < TOKEN_SEEN) add(a.tokens.tokens[i].x, a.tokens.tokens[i].z, 'token');
    const cops = a.heat.police;
    for (let i = 0; i < cops.count; i++) add(cops.x[i], cops.z[i], 'cop'); // cops show while they chase
    out.length = n;
    return out;
  };
}
