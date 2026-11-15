import type { CarSpecLink, CarSpecV2, DiffKind, DriveLayout } from '../types/cars';
import { createDefaultTuning, type CarTuning } from '../physics/carTuning';

/*
 * Real specs for the v2 handling model (contract: types/cars.ts), from docs/car-data.md. Brand names stay in src/data.
 * `est` lists the fields that car-data marks unverified or est.: those carry the documented estimate.
 * tyreMu (compound/era peak friction) and yawInertia (m * a * b * dynamic index) are always estimates, tuned against the
 * skidpad and slalom targets of the plan (section 5).
 */
type Tyre = [number, number, number];
const ty = (t: Tyre): { width: number; aspect: number; rim: number } => ({ width: t[0], aspect: t[1], rim: t[2] });
const inertia = (m: number, fw: number, wb: number, k: number): number => Math.round(m * wb * (1 - fw) * wb * fw * k);

interface Row {
  m: number; fw: number; wb: number; tr: [number, number]; cg: number; roll: number; drive: DriveLayout; awd: number;
  diff: DiffKind; pre: number; lock: number; tF: Tyre; tR: Tyre; mu: number;
  eng: [number, number, number, number, number, number]; gears: number[]; fd: number; cd: number; area: number;
  bias: number; k: number; ayc: number; character: string; est: string[];
}
const make = (r: Row): CarSpecV2 => ({
  mass: r.m, frontWeight: r.fw, wheelbase: r.wb, trackF: r.tr[0], trackR: r.tr[1], cgHeight: r.cg, rollFront: r.roll, drive: r.drive, awdFront: r.awd,
  diff: r.diff, lsdPreload: r.pre, lsdLock: r.lock, tyreF: ty(r.tF), tyreR: ty(r.tR), tyreMu: r.mu,
  engine: { peakPs: r.eng[0], psRpm: r.eng[1], peakNm: r.eng[2], nmRpm: r.eng[3], redline: r.eng[4], idle: r.eng[5] },
  gears: r.gears, finalDrive: r.fd, cd: r.cd, frontalArea: r.area, clF: 0, clR: 0, brakeBias: r.bias,
  yawInertia: inertia(r.m, r.fw, r.wb, r.k), ayc: r.ayc, character: r.character, est: ['tyreMu', 'yawInertia', 'rollFront', 'brakeBias', 'cgHeight', 'frontalArea', ...r.est],
});

export const SPECS: Readonly<Record<string, CarSpecV2>> = {
  // Honda Civic Type R EK9 (B16B, 5MT)
  civic: make({ roll: 0.5, m: 1070, fw: 0.62, wb: 2.62, tr: [1.48, 1.48], cg: 0.48, drive: 'FWD', awd: 1, diff: 'helical', pre: 0, lock: 0.45,
    tF: [195, 55, 15], tR: [195, 55, 15], mu: 0.92, eng: [185, 8200, 160, 7500, 8400, 900], gears: [3.23, 2.105, 1.458, 1.107, 0.848], fd: 4.4,
    cd: 0.33, area: 1.96, bias: 0.68, k: 1.1, ayc: 0, character: 'FWD, light, front helical LSD: pushes on power, lift or trail-brake to rotate it, the handbrake pivots it.',
    est: ['frontWeight', 'cd', 'redline'] }),
  // Volkswagen Golf IV GTI 1.8T (6MT 02M)
  golf: make({ roll: 0.55, m: 1279, fw: 0.61, wb: 2.511, tr: [1.513, 1.494], cg: 0.55, drive: 'FWD', awd: 1, diff: 'open', pre: 0, lock: 0,
    tF: [225, 40, 18], tR: [225, 40, 18], mu: 0.933, eng: [180, 5500, 235, 1950, 6500, 800], gears: [3.357, 2.087, 1.469, 1.15, 0.935, 0.763], fd: 3.944,
    cd: 0.34, area: 2.12, bias: 0.7, k: 1.3, ayc: 0, character: 'FWD turbo hatch, nose-heavy, open diff: safe understeer, the inside wheel spins out of tight turns.',
    est: ['frontWeight', 'diff', 'redline'] }),
  // Nissan 350Z (Z33 VQ35DE, 6MT, 18 in)
  '350z': make({ roll: 0.58, m: 1446, fw: 0.53, wb: 2.65, tr: [1.534, 1.544], cg: 0.47, drive: 'RWD', awd: 0, diff: 'viscous', pre: 0, lock: 0.35,
    tF: [225, 45, 18], tR: [245, 45, 18], mu: 0.971, eng: [291, 6200, 371, 4800, 6600, 700], gears: [3.794, 2.324, 1.624, 1.271, 1, 0.794], fd: 3.538,
    cd: 0.3, area: 2.03, bias: 0.66, k: 0.92, ayc: 0, character: 'RWD, front-mid V6: pushes on entry, steps out on power.',
    est: ['lsdLock'] }),
  // Mazda RX-7 FD3S (13B-REW, 5MT)
  rx7: make({ roll: 0.5, m: 1260, fw: 0.5, wb: 2.425, tr: [1.46, 1.46], cg: 0.45, drive: 'RWD', awd: 0, diff: 'helical', pre: 0, lock: 0.5,
    tF: [225, 50, 16], tR: [225, 50, 16], mu: 0.98, eng: [255, 6500, 294, 5000, 7000, 800], gears: [3.483, 2.015, 1.391, 1, 0.719], fd: 4.1,
    cd: 0.31, area: 1.84, bias: 0.64, k: 0.85, ayc: 0, character: 'RWD, front-mid rotary, 50:50 and light: rotates instantly, twitchy at the limit.',
    est: ['lsdLock'] }),
  // BMW 535d Touring E61 (M57, 6AT)
  e61: make({ roll: 0.56, m: 1760, fw: 0.525, wb: 2.886, tr: [1.558, 1.581], cg: 0.56, drive: 'RWD', awd: 0, diff: 'open', pre: 0, lock: 0,
    tF: [225, 50, 17], tR: [225, 50, 17], mu: 0.946, eng: [272, 4400, 560, 2000, 4800, 750], gears: [4.171, 2.34, 1.521, 1.143, 0.867, 0.691], fd: 2.56,
    cd: 0.3, area: 2.34, bias: 0.68, k: 1.0, ayc: 0, character: 'RWD diesel estate, long and heavy: stable understeer, the torque wall lights up the open diff.',
    est: ['frontWeight', 'diff', 'gears', 'redline'] }),
  // BMW M3 E46 (S54, 6MT)
  m3: make({ roll: 0.52, m: 1495, fw: 0.5, wb: 2.731, tr: [1.508, 1.525], cg: 0.49, drive: 'RWD', awd: 0, diff: 'clutch', pre: 40, lock: 0.35,
    tF: [225, 45, 18], tR: [255, 40, 18], mu: 1.005, eng: [343, 7900, 365, 4900, 8000, 800], gears: [4.227, 2.528, 1.669, 1.226, 1, 0.828], fd: 3.62,
    cd: 0.32, area: 2.07, bias: 0.64, k: 0.74, ayc: 0, character: 'RWD, 50:50 with a locking diff: balanced, steerable on the throttle, progressive at the limit.',
    est: ['diff', 'lsdLock'] }),
  // Mitsubishi Lancer Evolution VIII GSR (ACD + Super AYC, 6MT)
  evo: make({ roll: 0.5, m: 1410, fw: 0.59, wb: 2.625, tr: [1.515, 1.515], cg: 0.53, drive: 'AWD', awd: 0.5, diff: 'active', pre: 0, lock: 0.4,
    tF: [235, 45, 17], tR: [235, 45, 17], mu: 1.029, eng: [280, 6500, 392, 3500, 7000, 850], gears: [2.909, 1.944, 1.434, 1.1, 0.868, 0.693], fd: 4.583,
    cd: 0.36, area: 2.18, bias: 0.64, k: 0.95, ayc: 0.06, character: 'AWD with active yaw control: neutral, strongest out of corners, the best in rain and snow.',
    est: ['frontWeight', 'awdFront', 'cd', 'redline'] }),
  // Toyota Supra RZ A80 (2JZ-GTE, 6MT)
  supra: make({ roll: 0.55, m: 1490, fw: 0.53, wb: 2.55, tr: [1.52, 1.525], cg: 0.47, drive: 'RWD', awd: 0, diff: 'helical', pre: 0, lock: 0.5,
    tF: [225, 50, 16], tR: [245, 50, 16], mu: 0.974, eng: [326, 5600, 441, 4000, 6800, 800], gears: [3.827, 2.36, 1.685, 1.312, 1, 0.793], fd: 3.266,
    cd: 0.32, area: 1.96, bias: 0.65, k: 0.92, ayc: 0, character: 'RWD twin turbo, heavy: planted mid-corner, the boost surge spins the rears.',
    est: ['redline'] }),
};

/** Tuning overrides plus the v2 spec link (base values captured so upgrades and setup still scale v2). */
export function withSpec(id: string, tuning: Partial<CarTuning>): Partial<CarTuning> {
  const b = { ...createDefaultTuning(), ...tuning };
  const link: CarSpecLink = { spec: SPECS[id], ref: { mass: b.mass, gripFront: b.gripFront, gripRear: b.gripRear, cgHeight: b.cgHeight, brakeBias: b.brakeBias, brakeForce: b.brakeForce, dragCoef: b.dragCoef, loadSens: b.loadSens } };
  return { ...tuning, v2: link };
}
