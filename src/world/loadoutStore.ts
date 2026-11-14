import { defaultLoadout, type Loadout } from '../data/loadout';

/** The saved appearance of each car, read by the car factory when a visual is built (player car only; rivals use their own paint). */
const loadouts = new Map<string, Loadout>();
export const getLoadout = (carId: string): Loadout => loadouts.get(carId) ?? defaultLoadout();
export const setLoadout = (carId: string, l: Loadout): void => void loadouts.set(carId, l);
