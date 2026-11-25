import type { DistrictId, RoadGraph } from '../types/world';

/**
 * Areas that open with REP (Underground round, stage 2): Downtown and the Harbour are open from the start, the rest open
 * at a REP level. A district the story is sending you to is always open (the story never waits for REP). Pure.
 */
export const AREA_REP: Readonly<Record<DistrictId, number>> = { downtown: 1, harbour: 1, strip: 2, oldtown: 3, industrial: 4, hills: 6, bay: 8 };

export function areaOpen(d: DistrictId, level: number, storyOpen: ReadonlySet<DistrictId> | null = null): boolean {
  return level >= AREA_REP[d] || (storyOpen?.has(d) ?? false);
}

/** The middle of each district's junctions (map labels, lock badges). */
export function districtCentres(g: RoadGraph): { id: DistrictId; x: number; z: number }[] {
  const acc = new Map<DistrictId, [number, number, number]>();
  for (const n of g.nodes) { const v = acc.get(n.district) ?? [0, 0, 0]; v[0] += n.x; v[1] += n.z; v[2]++; acc.set(n.district, v); }
  return [...acc].map(([id, v]) => ({ id, x: v[0] / v[2], z: v[1] / v[2] }));
}

/**
 * Keeps the car out of locked districts: remembers the last spot in an open one, and `step` answers 0 (fine), or the
 * district the car just drove into (the caller puts the car back at `safeX/Z`, facing back). No allocation per step.
 */
export class AreaGuard {
  safeX = 0;
  safeZ = 0;
  safeH = 0;
  /** No safe spot yet (just arrived inside a locked district): driving there is allowed until the car reaches an open one. */
  private has = false;

  reset(): void { this.has = false; }

  step(x: number, z: number, h: number, d: DistrictId, open: boolean): DistrictId | null {
    if (open) { this.safeX = x; this.safeZ = z; this.safeH = h; this.has = true; return null; }
    return this.has ? d : null;
  }
}
