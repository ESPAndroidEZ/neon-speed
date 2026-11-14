import type { PartSlot } from '../world/carParts';

/** One purchasable body part. Brand names are FICTIONAL aftermarket makers. */
export interface CatalogPart {
  slot: PartSlot;
  /** A key of `PARTS[slot]` (world/carParts). */
  id: string;
  name: string;
  brand: string;
  tier: 1 | 2 | 3;
  price: number;
  /** Small handling delta applied with the part, as multipliers on CarTuning (aero parts trade drag for grip). */
  mul?: { gripFront?: number; gripRear?: number; dragCoef?: number };
}

/** Base price per slot; the price of a part is `partPrice(slot, tier)`. */
export const SLOT_BASE: Record<PartSlot, number> = { spoiler: 900, splitter: 700, skirts: 600, hood: 1100 };

/** price = base * tier^1.6, rounded to the nearest 50. */
export const partPrice = (slot: PartSlot, tier: 1 | 2 | 3): number => Math.round((SLOT_BASE[slot] * Math.pow(tier, 1.6)) / 50) * 50;

export const CATALOG: CatalogPart[] = [
  { slot: 'spoiler', id: 'gt-wing', name: 'GT-R wing', brand: 'Voltaic', tier: 2, price: partPrice('spoiler', 2), mul: { gripRear: 1.01, dragCoef: 1.03 } },
  { slot: 'splitter', id: 'blade', name: 'Carbon blade', brand: 'Kestrel Aero', tier: 1, price: partPrice('splitter', 1), mul: { gripFront: 1.005, dragCoef: 1.01 } },
  { slot: 'skirts', id: 'plain', name: 'Street skirts', brand: 'Orbit', tier: 1, price: partPrice('skirts', 1) },
  { slot: 'hood', id: 'vent', name: 'Vented bonnet', brand: 'Halden', tier: 2, price: partPrice('hood', 2) },
];
