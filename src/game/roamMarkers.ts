import type { RoamActivities } from './roamActivities';
import type { Marker } from '../ui/roamFullMap';

/** The full map's markers (race rings, drift zones, speed cameras, car meet, tokens not yet taken). Objects are reused. */
export function roamMarkers(a: RoamActivities): () => readonly Marker[] {
  const out: Marker[] = [];
  let n = 0;
  const add = (x: number, z: number, k: Marker['k']): void => {
    const m = out[n] ?? (out[n] = { x: 0, z: 0, k });
    m.x = x; m.z = z; m.k = k; n++;
  };
  return () => {
    n = 0;
    for (const r of a.races.races) add(r.x, r.z, 'race');
    for (const z of a.zones) add(z.x, z.z, 'zone');
    for (const p of a.traps) add(p.x, p.z, 'trap');
    if (a.meetSpot) add(a.meetSpot.x, a.meetSpot.z, 'meet');
    for (let i = 0; i < a.tokens.tokens.length; i++) if (!a.tokens.got[i]) add(a.tokens.tokens[i].x, a.tokens.tokens[i].z, 'token');
    out.length = n;
    return out;
  };
}
