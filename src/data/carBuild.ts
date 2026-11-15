import { DRIVING } from '../physics/assists';
import type { CarTuning } from '../physics/carTuning';
import { applySetup, defaultSetup, type Setup } from './setup';
import { applyStance, defaultLoadout } from './loadout';
import { getLoadout } from '../world/loadoutStore';
import { applyUpgrades, type Upgrades } from './upgrades';

/** What the player has done to each car: installed upgrades and the tuning setup (the saved values, mirrored here for the race setup). */
const builds = new Map<string, { upgrades: Upgrades; setup: Setup }>();

export const getBuild = (id: string): { upgrades: Upgrades; setup: Setup } => builds.get(id) ?? { upgrades: {}, setup: defaultSetup() };
export const setBuild = (id: string, upgrades: Upgrades, setup: Setup): void => void builds.set(id, { upgrades, setup });

/** The player's car at race start: base tuning (already applied) + upgrades + setup + stance. Also sets the steering multiplier. */
export function applyBuild(t: CarTuning, carId: string): void {
  const b = getBuild(carId);
  applyUpgrades(t, b.upgrades, carId);
  applySetup(t, b.setup);
  applyStance(t, (getLoadout(carId) ?? defaultLoadout()).stance);
  DRIVING.carMul = b.setup.steer;
}
