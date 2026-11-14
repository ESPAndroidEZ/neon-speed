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
  /** Turbo: extra torque multiplier at full boost (0 = naturally aspirated). */
  turboTorque: number;
  /** Seconds to spool from idle to full boost. */
  turboLag: number;
  /** Rpm above which the turbo starts to build boost. */
  turboRpm: number;
  /** Centre-of-gravity height in metres: bigger = more weight transfer. */
  cgHeight: number;
  /** Share (0..1) of cornering load transfer carried by the front axle: above 0.5 pushes (understeer), below it rotates. */
  rollFront: number;
  /** Grip lost per unit of squared load transfer (0 disables the effect). */
  loadSens: number;
  /** Share of brake force at the front axle (0.5..0.75). More front bias = stable but understeers under braking. */
  brakeBias: number;
  /** Seconds the throttle takes to follow the pedal (0 = instant). */
  throttleLag: number;
  /** Engine braking when lifting, in g at the redline. */
  engineBraking: number;
}

export const GEAR_RATIOS: readonly number[] = [3.6, 2.2, 1.55, 1.2, 0.97, 0.8];
export const REVERSE_RATIO = 3.2;

export function createDefaultTuning(): CarTuning {
  return {
    mass: 1300,
    inertia: 1900,
    cgToFront: 1.2,
    cgToRear: 1.4,
    gripFront: 1.3,
    gripRear: 1.25,
    tireB: 8,
    tireC: 1.5,
    handbrakeGrip: 0.45,
    handbrakeForce: 4500,
    brakeForce: 13000,
    maxSteer: 0.5,
    steerFalloffSpeed: 60,
    minSteerScale: 0.28,
    driftAssist: 0.6,
    yawDamping: 3500,
    dragCoef: 0.62,
    rollingResistance: 0.012,
    engineTorque: 430,
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
    turboTorque: 0,
    turboLag: 0.6,
    turboRpm: 2800,
    cgHeight: 0.42,
    rollFront: 0.5,
    loadSens: 0.22,
    brakeBias: 0.6,
    throttleLag: 0,
    engineBraking: 0.06,
  };
}

/** Copy `overrides` onto `into` in place (keeps live references such as the tuning panel valid). */
export function applyTuning(into: CarTuning, overrides: Partial<CarTuning>): CarTuning {
  Object.assign(into, createDefaultTuning(), overrides);
  return into;
}
