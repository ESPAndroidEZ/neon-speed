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
    tuning: { mass: 1180, inertia: 1500, engineTorque: 220, dragCoef: 0.68, driftAssist: 0.75, handbrakeGrip: 0.5, gripRear: 1.2, yawDamping: 3000 },
    shape: { length: 4.25, width: 1.72, height: 1.4, hoodLength: 1.25, windshieldRun: 0.85, rearWindowRun: 0.75, roofLength: 1.3, beltHeight: 0.84, wheelbase: 2.62, wheelRadius: 0.3, spoiler: 'lip' },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'i4', turbo: 'none' },
  },
  {
    id: '350z',
    brand: 'Nissan',
    name: '350Z',
    price: 12000,
    color: 0xe0661a,
    blurb: 'Balanced rear-drive coupe. Torquey, playful, quick to rotate.',
    tuning: {},
    shape: { length: 4.31, width: 1.82, height: 1.32, hoodLength: 1.55, windshieldRun: 0.8, rearWindowRun: 0.55, roofLength: 0.95, beltHeight: 0.82, wheelbase: 2.65, wheelRadius: 0.32, spoiler: 'lip' },
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
    tuning: { mass: 1250, inertia: 1750, engineTorque: 330, turboTorque: 0.4, turboLag: 0.32, peakRpm: 6200, torqueWidth: 4400, dragCoef: 0.62, gripFront: 1.38, gripRear: 1.34, driftAssist: 0.6, handbrakeGrip: 0.45 },
    shape: { length: 4.28, width: 1.77, height: 1.23, hoodLength: 1.5, windshieldRun: 0.85, rearWindowRun: 0.6, roofLength: 0.8, beltHeight: 0.78, wheelbase: 2.43, wheelRadius: 0.31, spoiler: 'lip' },
    model: { yaw: 0, scale: 1 },
    sound: { layout: 'rotary', turbo: 'sequential' },
  },
  {
    id: 'evo',
    brand: 'Mitsubishi',
    name: 'Lancer Evolution VIII',
    price: 34000,
    color: 0x2a4fa8,
    blurb: 'All-wheel-drive grip monster. Brutal out of corners, stubborn to slide.',
    tuning: { mass: 1400, inertia: 2050, engineTorque: 470, turboTorque: 0.5, turboLag: 0.75, dragCoef: 0.68, gripFront: 1.62, gripRear: 1.62, handbrakeGrip: 0.55, driftAssist: 0.5, minSteerScale: 0.34, yawDamping: 4200 },
    shape: { length: 4.51, width: 1.77, height: 1.45, hoodLength: 1.4, windshieldRun: 0.9, rearWindowRun: 0.7, roofLength: 1.2, beltHeight: 0.88, wheelbase: 2.63, wheelRadius: 0.32, spoiler: 'wing' },
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
    tuning: { mass: 1500, inertia: 2250, engineTorque: 520, turboTorque: 0.55, turboLag: 0.5, dragCoef: 0.56, gripRear: 1.5, gripFront: 1.55, driftAssist: 0.5, handbrakeGrip: 0.42, nitroTorqueMul: 1.5 },
    shape: { length: 4.38, width: 1.86, height: 1.29, hoodLength: 1.6, windshieldRun: 0.8, rearWindowRun: 0.5, roofLength: 0.9, beltHeight: 0.8, wheelbase: 2.67, wheelRadius: 0.33, spoiler: 'wing' },
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
