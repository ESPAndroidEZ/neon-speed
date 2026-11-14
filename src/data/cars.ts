import type { BodyShape } from '../world/carBody';
import type { CarTuning } from '../physics/carTuning';

/*
 * The ONLY place real brand and model names appear. Swap this file for fictional cars if needed.
 * `tuning` overrides the defaults in physics/carTuning.ts, so each car handles differently.
 */

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
    blurb: 'Light, forgiving, easy to slide. The perfect first drift car.',
    tuning: { mass: 1180, inertia: 1500, engineTorque: 220, dragCoef: 0.68, driftAssist: 0.75, handbrakeGrip: 0.5, gripRear: 1.25 },
    shape: { length: 4.25, width: 1.72, height: 1.4, hoodLength: 1.25, windshieldRun: 0.85, rearWindowRun: 0.75, roofLength: 1.3, beltHeight: 0.84, wheelbase: 2.62, wheelRadius: 0.3, spoiler: 'lip' },
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
  },
  {
    id: 'supra',
    brand: 'Toyota',
    name: 'Supra',
    price: 40000,
    color: 0xc41a2b,
    blurb: 'Huge power, long wheelbase. Fast, and it bites if you get greedy.',
    tuning: { mass: 1480, inertia: 2250, engineTorque: 720, dragCoef: 0.56, gripRear: 1.5, gripFront: 1.55, driftAssist: 0.5, handbrakeGrip: 0.42, nitroTorqueMul: 1.5 },
    shape: { length: 4.38, width: 1.86, height: 1.29, hoodLength: 1.6, windshieldRun: 0.8, rearWindowRun: 0.5, roofLength: 0.9, beltHeight: 0.8, wheelbase: 2.67, wheelRadius: 0.33, spoiler: 'wing' },
  },
];

export const findCar = (id: string): CarSpec => CARS.find((c) => c.id === id) ?? CARS[0];

/** Paint choices in the garage. */
export const PAINTS: readonly number[] = [0xe8e8ee, 0x14141a, 0xc41a2b, 0xe0661a, 0xf2c200, 0x2fa84f, 0x1f5fd6, 0x7a2fd6, 0xff2a9d];
