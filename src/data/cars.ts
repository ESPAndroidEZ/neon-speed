import type { BodyShape } from '../world/carBody';
import type { CarTuning } from '../physics/carTuning';

/*
 * The ONLY place real brand and model names appear. Swap this file for fictional cars if needed.
 * `tuning` overrides the defaults in physics/carTuning.ts, so each car handles differently.
 * GLB bodies (free Tripo3D tier) are picked up from public/models/<id>.glb when present;
 * otherwise the procedural body built from `shape` is used.
 */

export interface ModelConfig {
  /** Yaw fix in radians if the generated mesh faces the wrong way (calibrate in the garage, paste here). */
  yaw: number;
  /** Extra uniform scale on top of the shape's length. */
  scale: number;
}

export interface CarSpec {
  id: string;
  brand: string;
  name: string;
  /** Cash price; 0 = owned at the start. */
  price: number;
  /** Factory paint, 0xRRGGBB. */
  color: number;
  /** Physics calibrated to the real car (data/carReal: kg, Nm, rpm, drivetrain; finalDrive/topRatio fitted to 0-100 and top speed by tests/lab/real-calibrate.mts). */
  tuning: Partial<CarTuning>;
  shape: BodyShape;
  model: ModelConfig;
  /** Engine layout for the audio and the turbo whistle character. */
  sound: { layout: 'i4' | 'v6' | 'i6' | 'rotary'; turbo: 'none' | 'single' | 'twin' | 'sequential' };
  /** One line for the garage screen. */
  blurb: string;
}

export const CARS: readonly CarSpec[] = [
  {
    id: 'civic',
    brand: 'Honda',
    name: 'Civic',
    price: 0,
    color: 0xe8e8ee,
    blurb: 'Light, tail-happy and forgiving. The perfect first drift car.',
    tuning: { mass: 1070, inertia: 1360, engineTorque: 160, dragCoef: 0.5, driftAssist: 0.75, handbrakeGrip: 0.33, slideCap: 0.54, gripRear: 1.2, yawDamping: 3000, cgHeight: 0.46, rollFront: 0.44, brakeBias: 0.74, throttleLag: 0.1, engineBraking: 0.05, peakRpm: 7500, torqueWidth: 7500, redlineRpm: 8400, driveFront: 1, cgToFront: 1.1, cgToRear: 1.5, finalDrive: 4.4, topRatio: 0.82 },
    shape: { length: 4.25, width: 1.72, height: 1.4, hoodLength: 1.2, windshieldRun: 0.85, rearWindowRun: 0.55, roofLength: 1.4, beltHeight: 0.84, wheelbase: 2.62, wheelRadius: 0.3, spoiler: 'lip', haunch: 0.02, noseLow: 0.02, scoop: false },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'i4', turbo: 'none' },
  },
  {
    id: 'golf',
    brand: 'Volkswagen',
    name: 'Golf IV GTI',
    price: 9000,
    color: 0x1d2a44,
    blurb: 'Small turbo hatch: torque from nowhere, light on its feet, a giant-killer in tight streets.',
    tuning: { mass: 1260, inertia: 1590, engineTorque: 181, turboTorque: 0.3, turboLag: 0.55, redlineRpm: 6500, dragCoef: 0.51, driftAssist: 0.7, handbrakeGrip: 0.38, slideCap: 0.54, gripRear: 1.2, yawDamping: 3100, cgHeight: 0.48, rollFront: 0.5, brakeBias: 0.74, throttleLag: 0.1, engineBraking: 0.05, peakRpm: 3300, driveFront: 1, cgToFront: 1.1, cgToRear: 1.5, finalDrive: 2.9, topRatio: 0.67 },
    shape: { length: 4.15, width: 1.73, height: 1.44, hoodLength: 1.0, windshieldRun: 0.85, rearWindowRun: 0.45, roofLength: 1.5, beltHeight: 0.88, wheelbase: 2.51, wheelRadius: 0.3, spoiler: 'lip', haunch: 0.02, noseLow: 0.03, scoop: false },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'i4', turbo: 'single' },
  },
  {
    id: '350z',
    brand: 'Nissan',
    name: '350Z',
    price: 12000,
    color: 0xe0661a,
    blurb: 'Balanced rear-drive coupe. Torquey, playful, quick to rotate.',
    tuning: { dragCoef: 0.57, cgHeight: 0.42, rollFront: 0.5, brakeBias: 0.70, throttleLag: 0.05, engineBraking: 0.07, inertia: 2100, mass: 1440, engineTorque: 363, peakRpm: 4800, redlineRpm: 6600, driveFront: 0, cgToFront: 1.25, cgToRear: 1.35, finalDrive: 2.7, topRatio: 0.7 },
    shape: { length: 4.31, width: 1.82, height: 1.32, hoodLength: 1.6, windshieldRun: 0.8, rearWindowRun: 1.25, roofLength: 0.45, beltHeight: 0.82, wheelbase: 2.65, wheelRadius: 0.32, spoiler: 'lip', haunch: 0.06, noseLow: 0.06, scoop: false },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'v6', turbo: 'none' },
  },
  {
    id: 'rx7',
    brand: 'Mazda',
    name: 'RX-7',
    price: 24000,
    color: 0xf2c200,
    blurb: 'Light, high-revving and beautifully balanced. Rewards clean lines.',
    tuning: { mass: 1260, inertia: 1760, engineTorque: 224, turboTorque: 0.4, turboLag: 0.32, peakRpm: 5000, torqueWidth: 4400, dragCoef: 0.52, gripFront: 1.38, gripRear: 1.34, driftAssist: 0.6, handbrakeGrip: 0.45, cgHeight: 0.4, rollFront: 0.48, brakeBias: 0.68, engineBraking: 0.04, redlineRpm: 8000, driveFront: 0, cgToFront: 1.25, cgToRear: 1.35, finalDrive: 3.4, topRatio: 0.52 },
    shape: { length: 4.28, width: 1.77, height: 1.23, hoodLength: 1.5, windshieldRun: 0.85, rearWindowRun: 1.05, roofLength: 0.5, beltHeight: 0.78, wheelbase: 2.43, wheelRadius: 0.31, spoiler: 'lip', haunch: 0.1, noseLow: 0.13, scoop: false },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'rotary', turbo: 'sequential' },
  },
  {
    id: 'e61',
    brand: 'BMW',
    name: '535d Touring (E61)',
    price: 26000,
    color: 0x2b2f36,
    blurb: 'Twin-turbo diesel estate: a wall of torque, heavy and long. Unstoppable on straights, a handful in hairpins.',
    tuning: { mass: 1780, inertia: 2320, engineTorque: 386, turboTorque: 0.45, turboLag: 0.6, idleRpm: 800, redlineRpm: 5000, dragCoef: 0.54, gripFront: 1.5, gripRear: 1.5, driftAssist: 0.6, handbrakeGrip: 0.48, slideCap: 0.52, yawDamping: 4300, cgHeight: 0.5, rollFront: 0.54, brakeBias: 0.7, engineBraking: 0.07, peakRpm: 2000, driveFront: 0, cgToFront: 1.25, cgToRear: 1.35, finalDrive: 2.9, topRatio: 0.79 },
    shape: { length: 4.84, width: 1.85, height: 1.49, hoodLength: 1.45, windshieldRun: 0.9, rearWindowRun: 0.35, roofLength: 2.0, beltHeight: 0.9, wheelbase: 2.89, wheelRadius: 0.33, spoiler: 'none', haunch: 0.03, noseLow: 0.04, scoop: false },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'i6', turbo: 'twin' },
  },
  {
    id: 'm3',
    brand: 'BMW',
    name: 'M3 (E46)',
    price: 31000,
    color: 0x6f8aa6,
    blurb: 'High-revving straight-six to 8000 rpm, perfect balance, a born drifter. The driver\'s choice.',
    tuning: { mass: 1495, inertia: 2060, engineTorque: 365, redlineRpm: 8000, dragCoef: 0.68, gripFront: 1.58, gripRear: 1.55, driftAssist: 0.6, handbrakeGrip: 0.45, slideCap: 0.56, yawDamping: 3700, cgHeight: 0.44, rollFront: 0.5, brakeBias: 0.7, engineBraking: 0.08, peakRpm: 4900, driveFront: 0, cgToFront: 1.25, cgToRear: 1.35, finalDrive: 2.6, topRatio: 0.49 },
    shape: { length: 4.49, width: 1.78, height: 1.37, hoodLength: 1.45, windshieldRun: 0.85, rearWindowRun: 0.7, roofLength: 0.95, beltHeight: 0.84, wheelbase: 2.73, wheelRadius: 0.32, spoiler: 'lip', haunch: 0.05, noseLow: 0.04, scoop: false },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'i6', turbo: 'none' },
  },
  {
    id: 'evo',
    brand: 'Mitsubishi',
    name: 'Lancer Evolution VIII',
    price: 34000,
    color: 0x2a4fa8,
    blurb: 'All-wheel-drive grip monster. Brutal out of corners, stubborn to slide.',
    tuning: { mass: 1410, inertia: 2060, engineTorque: 261, turboTorque: 0.5, turboLag: 0.75, dragCoef: 0.55, gripFront: 1.56, gripRear: 1.6, handbrakeGrip: 0.47, driftAssist: 0.5, slideCap: 0.52, minSteerScale: 0.34, yawDamping: 4200, cgHeight: 0.46, rollFront: 0.58, brakeBias: 0.72, engineBraking: 0.08, peakRpm: 3500, redlineRpm: 7000, driveFront: 0.45, cgToFront: 1.14, cgToRear: 1.46, finalDrive: 3.2, topRatio: 0.46 },
    shape: { length: 4.51, width: 1.77, height: 1.45, hoodLength: 1.4, windshieldRun: 0.9, rearWindowRun: 0.55, roofLength: 1.1, beltHeight: 0.88, wheelbase: 2.63, wheelRadius: 0.32, spoiler: 'wing', haunch: 0.03, noseLow: 0.03, scoop: true },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'i4', turbo: 'single' },
  },
  {
    id: 'supra',
    brand: 'Toyota',
    name: 'Supra',
    price: 48000,
    color: 0xc41a2b,
    blurb: 'Heavy, huge power, long wheelbase. Fast, and it bites if you get greedy.',
    tuning: { mass: 1510, inertia: 2260, engineTorque: 285, turboTorque: 0.55, turboLag: 0.5, dragCoef: 0.64, gripRear: 1.58, gripFront: 1.62, driftAssist: 0.5, handbrakeGrip: 0.42, nitroTorqueMul: 1.5, cgHeight: 0.4, rollFront: 0.46, brakeBias: 0.68, engineBraking: 0.09, peakRpm: 4000, redlineRpm: 6800, driveFront: 0, cgToFront: 1.25, cgToRear: 1.35, finalDrive: 4.1, topRatio: 0.9 },
    shape: { length: 4.38, width: 1.86, height: 1.29, hoodLength: 1.65, windshieldRun: 0.8, rearWindowRun: 1.0, roofLength: 0.55, beltHeight: 0.8, wheelbase: 2.67, wheelRadius: 0.33, spoiler: 'wing', haunch: 0.07, noseLow: 0.07, scoop: false },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'i6', turbo: 'twin' },
  },
];

export const findCar = (id: string): CarSpec => CARS.find((c) => c.id === id) ?? CARS[0];

/** URL of the optional GLB body for a car. */
export const modelUrl = (c: CarSpec): string => `${import.meta.env?.BASE_URL ?? '/'}models/${c.id}.glb`;

/** Paint choices in the garage. */
export const PAINTS: readonly number[] = [0xe8e8ee, 0x14141a, 0xc41a2b, 0xe0661a, 0xf2c200, 0x2fa84f, 0x1f5fd6, 0x7a2fd6, 0xff2a9d];
/** Underglow choices in the garage. */
export const GLOWS: readonly number[] = [0x2a6bff, 0x18d8ff, 0xff2a9d, 0x39ff88, 0xffb347, 0x9b5cff, 0xffffff];
