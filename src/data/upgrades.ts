import type { CarTuning } from '../physics/carTuning';

/**
 * Performance upgrades: 11 categories, 3 levels each. Every level is a set of multipliers (`mul`) and additions (`add`) on
 * `CarTuning`, so they stack and are data only. Prices are in cash; `needs` limits a category to cars that have the part
 * (the turbo model is locked: its upgrade only strengthens a turbo that already exists). Part names are FICTIONAL brands.
 */
export type UpgradeId = 'engine' | 'turbo' | 'ecu' | 'exhaust' | 'tyres' | 'suspension' | 'brakes' | 'weight' | 'gearbox' | 'nitrous' | 'differential';

type Delta = { mul?: Partial<Record<keyof CarTuning, number>>; add?: Partial<Record<keyof CarTuning, number>> };

export interface UpgradeLevel extends Delta {
  name: string;
  price: number;
}

export interface UpgradeCategory {
  id: UpgradeId;
  name: string;
  blurb: string;
  needs?: 'turbo';
  levels: readonly [UpgradeLevel, UpgradeLevel, UpgradeLevel];
}

const lv = (name: string, price: number, d: Delta): UpgradeLevel => ({ name, price, ...d });

export const UPGRADES: readonly UpgradeCategory[] = [
  { id: 'engine', name: 'Engine', blurb: 'Ported head, forged internals, bigger bore.', levels: [
    lv('Stage 1 Kurogane head work', 1800, { mul: { engineTorque: 1.05 } }), lv('Stage 2 Voss forged pistons', 4200, { mul: { engineTorque: 1.11 } }), lv('Stage 3 Aster full build', 9500, { mul: { engineTorque: 1.18 } })] },
  { id: 'turbo', name: 'Turbo', needs: 'turbo', blurb: 'Bigger boost and quicker spool on turbo cars.', levels: [
    lv('Halden ball-bearing core', 2200, { mul: { turboTorque: 1.08, turboLag: 0.94 } }), lv('Halden twin-scroll', 5200, { mul: { turboTorque: 1.16, turboLag: 0.88 } }), lv('Halden billet race turbo', 11000, { mul: { turboTorque: 1.25, turboLag: 0.82 } })] },
  { id: 'ecu', name: 'ECU', blurb: 'Remap: higher redline, crisper shifts.', levels: [
    lv('Nimbus street map', 900, { mul: { engineTorque: 1.02, shiftTime: 0.92 }, add: { redlineRpm: 200 } }), lv('Nimbus track map', 2400, { mul: { engineTorque: 1.04, shiftTime: 0.84 }, add: { redlineRpm: 400 } }), lv('Nimbus open ECU', 5200, { mul: { engineTorque: 1.06, shiftTime: 0.76 }, add: { redlineRpm: 600 } })] },
  { id: 'exhaust', name: 'Intake and exhaust', blurb: 'Free-flow intake, header and cat-back. Wider power band.', levels: [
    lv('Ryo cold-air intake', 700, { mul: { engineTorque: 1.02 }, add: { torqueWidth: 150 } }), lv('Ryo header and cat-back', 2000, { mul: { engineTorque: 1.04 }, add: { torqueWidth: 350 } }), lv('Ryo titanium race system', 4600, { mul: { engineTorque: 1.06 }, add: { torqueWidth: 600 } })] },
  { id: 'tyres', name: 'Tyres', blurb: 'More grip front and rear.', levels: [
    lv('Pyrel sport tyres', 1200, { mul: { gripFront: 1.04, gripRear: 1.04 } }), lv('Pyrel semi-slicks', 3000, { mul: { gripFront: 1.08, gripRear: 1.08 } }), lv('Pyrel race slicks', 6800, { mul: { gripFront: 1.12, gripRear: 1.12 } })] },
  { id: 'suspension', name: 'Suspension', blurb: 'Stiffer, better-damped: less grip lost in roll.', levels: [
    lv('Tekton sport springs', 1000, { mul: { loadSens: 0.92 } }), lv('Tekton coilovers', 2800, { mul: { loadSens: 0.84 } }), lv('Tekton race coilovers', 6200, { mul: { loadSens: 0.76 } })] },
  { id: 'brakes', name: 'Brakes', blurb: 'Bigger discs, better pads.', levels: [
    lv('Argo sport pads', 800, { mul: { brakeForce: 1.06 } }), lv('Argo big-brake kit', 2300, { mul: { brakeForce: 1.12 } }), lv('Argo carbon ceramic', 6000, { mul: { brakeForce: 1.2 } })] },
  { id: 'weight', name: 'Weight reduction', blurb: 'Strip the interior, carbon panels.', levels: [
    lv('Light: interior strip', 1100, { mul: { mass: 0.97, inertia: 0.97 } }), lv('Medium: fibre panels', 3400, { mul: { mass: 0.94, inertia: 0.94 } }), lv('Race: full carbon', 8200, { mul: { mass: 0.9, inertia: 0.9 } })] },
  { id: 'gearbox', name: 'Gearbox', blurb: 'Quick-shift internals: faster, cleaner gear changes.', levels: [
    lv('Kato short shifter', 900, { mul: { shiftTime: 0.9 } }), lv('Kato close-ratio gears', 2900, { mul: { shiftTime: 0.78 }, add: { upshiftFrac: 0.01 } }), lv('Kato dog-box', 6400, { mul: { shiftTime: 0.64 }, add: { upshiftFrac: 0.02 } })] },
  { id: 'nitrous', name: 'Nitrous', blurb: 'Stronger and longer nitro.', levels: [
    lv('Flux 50 shot', 1000, { add: { nitroTorqueMul: 0.06 }, mul: { nitroBurnPerSec: 0.95 } }), lv('Flux 100 shot', 2600, { add: { nitroTorqueMul: 0.12 }, mul: { nitroBurnPerSec: 0.9 } }), lv('Flux 150 shot', 5600, { add: { nitroTorqueMul: 0.2 }, mul: { nitroBurnPerSec: 0.84 } })] },
  { id: 'differential', name: 'Differential', blurb: 'A locking diff: more traction out of corners and easier drift control.', levels: [
    lv('Orbit 1.5-way', 1100, { add: { driftAssist: 0.03 }, mul: { driveEfficiency: 1.005 } }), lv('Orbit 2-way', 3000, { add: { driftAssist: 0.06 }, mul: { driveEfficiency: 1.01 } }), lv('Orbit race diff', 6600, { add: { driftAssist: 0.09 }, mul: { driveEfficiency: 1.015 } })] },
];

export const UPGRADE_IDS = UPGRADES.map((u) => u.id);
export type Upgrades = Partial<Record<UpgradeId, 0 | 1 | 2 | 3>>;

export const findUpgrade = (id: UpgradeId): UpgradeCategory => UPGRADES.find((u) => u.id === id) ?? UPGRADES[0];

/** Apply installed upgrades to a tuning, in place. Turbo parts are ignored on cars without a turbo. */
export function applyUpgrades(t: CarTuning, up: Upgrades): void {
  for (const cat of UPGRADES) {
    const level = up[cat.id] ?? 0;
    if (level === 0 || (cat.needs === 'turbo' && t.turboTorque <= 0)) continue;
    const l = cat.levels[level - 1]; // each level states the TOTAL effect of that category, not a step on top of the last
    for (const [k, v] of Object.entries(l.mul ?? {})) (t as unknown as Record<string, number>)[k] *= v as number;
    for (const [k, v] of Object.entries(l.add ?? {})) (t as unknown as Record<string, number>)[k] += v as number;
  }
}

/** Keep stored upgrade levels valid (unknown ids dropped, levels clamped to 0..3). */
export function sanitizeUpgrades(raw: unknown): Upgrades {
  const out: Upgrades = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const id of UPGRADE_IDS) {
    const v = (raw as Record<string, unknown>)[id];
    if (typeof v === 'number' && v >= 1) out[id] = Math.min(3, Math.floor(v)) as 1 | 2 | 3;
  }
  return out;
}
