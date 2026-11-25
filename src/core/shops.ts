import type { DistrictId, RoadGraph } from '../types/world';

/** Shops as places in the city (Underground round, stage 2): the garage, a parts shop and a paint shop. */
export type ShopKind = 'garage' | 'parts' | 'paint';
export interface Shop { kind: ShopKind; x: number; z: number; district: DistrictId }
export const SHOP_R = 10;
/** Where each shop is: open districts from the start, so every player can reach them. */
const HOME: Readonly<Record<ShopKind, DistrictId>> = { garage: 'downtown', parts: 'harbour', paint: 'downtown' };

/** One junction per shop, away from the given rings (race starts, story places) and from each other. Pure. */
export function placeShops(g: RoadGraph, avoid: readonly { x: number; z: number }[], apart = 80): Shop[] {
  const out: Shop[] = [];
  for (const kind of Object.keys(HOME) as ShopKind[]) {
    const d = HOME[kind];
    const nodes = g.nodes.filter((n) => n.district === d && n.edges.length >= 3);
    if (!nodes.length) continue;
    const cx = nodes.reduce((a, n) => a + n.x, 0) / nodes.length, cz = nodes.reduce((a, n) => a + n.z, 0) / nodes.length;
    nodes.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
    const far = (n: { x: number; z: number }): boolean => [...avoid, ...out].every((p) => Math.hypot(p.x - n.x, p.z - n.z) > apart);
    const n = nodes.find(far) ?? nodes[0];
    out.push({ kind, x: n.x, z: n.z, district: d });
  }
  return out;
}

/** Which shop ring the car is in (-1 = none). */
export function shopAt(shops: readonly Shop[], x: number, z: number): number {
  for (let i = 0; i < shops.length; i++) { const dx = shops[i].x - x, dz = shops[i].z - z; if (dx * dx + dz * dz < SHOP_R * SHOP_R) return i; }
  return -1;
}
