/**
 * CAR SPEC CONTRACT v2 (2026-11-15, block C, docs/handling-plan.md section 1). Real-world car data for the v2 handling
 * model (src/physics/v2). Pure data: no three, no brand names here (those stay in src/data). Fields that docs/car-data.md
 * marks unverified or est. carry the documented estimate; the data file flags them per car in `est`.
 */
export type DriveLayout = 'FWD' | 'RWD' | 'AWD';
export type DiffKind = 'open' | 'helical' | 'viscous' | 'clutch' | 'active';

export interface TyreSize {
  /** Section width, mm. */
  width: number;
  /** Aspect ratio, % (sidewall height / width). */
  aspect: number;
  /** Rim diameter, inches. */
  rim: number;
}

export interface EngineSpec {
  peakPs: number;
  psRpm: number;
  peakNm: number;
  nmRpm: number;
  redline: number;
  idle: number;
}

export interface CarSpecV2 {
  /** Kerb mass, kg. */
  mass: number;
  /** Static share of the weight on the front axle, 0..1. */
  frontWeight: number;
  /** Metres. */
  wheelbase: number;
  trackF: number;
  trackR: number;
  cgHeight: number;
  /** Share of the cornering load transfer taken by the front axle (roll stiffness distribution): THE balance knob. */
  rollFront: number;
  drive: DriveLayout;
  /** Static front share of drive torque (AWD only; 1 for FWD, 0 for RWD). */
  awdFront: number;
  /** Driven-axle differential (AWD: the rear one; `active` = yaw-control rear diff). */
  diff: DiffKind;
  /** Locking torque with no input torque, Nm. */
  lsdPreload: number;
  /** 0..1 share of the wheel-to-wheel torque difference the diff can bias toward the loaded wheel. */
  lsdLock: number;
  tyreF: TyreSize;
  tyreR: TyreSize;
  /** Peak tyre friction coefficient of the fitted tyre (compound/era estimate, dry, at nominal load). */
  tyreMu: number;
  engine: EngineSpec;
  /** Real gear ratios (reference; the game gearbox stays the 6-speed auto of physics/drivetrain). */
  gears: readonly number[];
  finalDrive: number;
  cd: number;
  /** m^2. */
  frontalArea: number;
  /** Downforce coefficient (Cl * A share) per axle; 0 for street cars. */
  clF: number;
  clR: number;
  /** Share of brake force at the front, 0..1. */
  brakeBias: number;
  /** Yaw moment of inertia, kg m^2 (estimate from mass, wheelbase and engine position). */
  yawInertia: number;
  /** Active yaw control strength (share of the front lateral moment, 0 = none). */
  ayc: number;
  /** One line for the garage: layout and its character. */
  character: string;
  /** Field names that are estimates (unverified in docs/car-data.md). */
  est: readonly string[];
}

/** Base tuning values a spec was linked with: v2 scales its own figures by how upgrades and setup moved these. */
export interface SpecRef {
  mass: number;
  gripFront: number;
  gripRear: number;
  cgHeight: number;
  brakeBias: number;
  brakeForce: number;
  dragCoef: number;
  loadSens: number;
}

/** What a car's tuning carries for the v2 model (CarTuning.v2). */
export interface CarSpecLink {
  spec: CarSpecV2;
  ref: SpecRef;
}
