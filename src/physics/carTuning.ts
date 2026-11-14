/** Every number here is live-tunable from the in-game panel (backtick key). */
export interface CarTuning {
  mass: number;
  inertia: number;
  /** Metres from the centre of mass to the front / rear axle. */
  cgToFront: number;
  cgToRear: number;
  /** Peak tyre friction coefficients (dry). */
  gripFront: number;
  gripRear: number;
  /** Tyre curve: stiffness B and shape C. Lower C = more grip left when sliding. */
  tireB: number;
  tireC: number;
  /** Rear grip multiplier while the handbrake is held (0.3 = very loose). */
  handbrakeGrip: number;
  handbrakeForce: number;
  brakeForce: number;
  /** Full-lock steering angle in radians, shrinking with speed. */
  maxSteer: number;
  steerFalloffSpeed: number;
  minSteerScale: number;
  /** 0..1 auto counter-steer when the stick is released mid-slide. */
  driftAssist: number;
  yawDamping: number;
  /** Drag = dragCoef * v^2. */
  dragCoef: number;
  rollingResistance: number;
  engineTorque: number;
  peakRpm: number;
  torqueWidth: number;
  idleRpm: number;
  redlineRpm: number;
  upshiftFrac: number;
  downshiftFrac: number;
  shiftTime: number;
  wheelRadius: number;
  finalDrive: number;
  driveEfficiency: number;
  nitroTorqueMul: number;
  nitroBurnPerSec: number;
  nitroDriftRefillPerSec: number;
}

export const GEAR_RATIOS: readonly number[] = [3.6, 2.2, 1.55, 1.2, 0.97, 0.8];
export const REVERSE_RATIO = 3.2;

export function createDefaultTuning(): CarTuning {
  return {
    mass: 1300,
    inertia: 1900,
    cgToFront: 1.2,
    cgToRear: 1.4,
    gripFront: 1.15,
    gripRear: 1.1,
    tireB: 8,
    tireC: 1.5,
    handbrakeGrip: 0.3,
    handbrakeForce: 4500,
    brakeForce: 11000,
    maxSteer: 0.5,
    steerFalloffSpeed: 60,
    minSteerScale: 0.28,
    driftAssist: 0.6,
    yawDamping: 1500,
    dragCoef: 0.45,
    rollingResistance: 0.012,
    engineTorque: 380,
    peakRpm: 5200,
    torqueWidth: 4600,
    idleRpm: 1000,
    redlineRpm: 7500,
    upshiftFrac: 0.93,
    downshiftFrac: 0.4,
    shiftTime: 0.18,
    wheelRadius: 0.32,
    finalDrive: 3.9,
    driveEfficiency: 0.9,
    nitroTorqueMul: 1.55,
    nitroBurnPerSec: 0.22,
    nitroDriftRefillPerSec: 0.12,
  };
}
