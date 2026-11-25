import type { SaveStore } from './save';

/**
 * Look items bought in the paint shop (Underground round, stage 4): an underglow kit and each vinyl design, once per car
 * (`SaveData.bought[carId]`: `glow`, `vinyl:<id>`). Older saves keep what they already had for free: a chosen underglow
 * colour, or the vinyl on the car. Spending only goes through `buyItem` (cash is never banked here).
 */
export const GLOW_PRICE = 1200;
export const VINYL_PRICE = 600;
export const itemPrice = (key: string): number => (key === 'glow' ? GLOW_PRICE : VINYL_PRICE);

export function ownsItem(store: SaveStore, carId: string, key: string): boolean {
  const d = store.data;
  if (d.bought?.[carId]?.includes(key)) return true;
  if (key === 'glow') return d.glow[carId] !== undefined; // chosen before the shop existed
  return key === `vinyl:${d.loadouts[carId]?.vinyl.kind ?? ''}` && key !== 'vinyl:';
}

/** Pay and own (false when it is already owned, the car is not yours, or the cash is short). */
export function buyItem(store: SaveStore, carId: string, key: string): boolean {
  const price = itemPrice(key), d = store.data;
  if (ownsItem(store, carId, key) || !store.owns(carId) || d.cash < price) return false;
  d.cash -= price;
  const list = ((d.bought ??= {})[carId] ??= []);
  list.push(key);
  store.commit();
  return true;
}
