import type { Group, Object3D, PerspectiveCamera, Vector3 } from 'three';

/*
 * SHARED CONTRACTS: the single source of truth between modules.
 * Changing anything here is an architectural change; update docs/handoff.md too.
 *
 * Conventions every module must follow:
 *  - Right-handed, Y up. Metres, seconds, radians.
 *  - Car local space: +Z = nose, +X = the car's LEFT, +Y = up.
 *  - Heading (yaw) rotates about +Y; world-space forward = (sin h, 0, cos h).
 *    Positive yaw therefore turns LEFT, so CarInput.steer > 0 steers left.
 *  - Simulation advances only in fixed 1/60 s steps; cameras and visuals run per display frame.
 */

export type GameState = 'MENU' | 'CINEMATIC' | 'RACING' | 'PODIUM' | 'FREEROAM';

export type Weather = 'CLEAR' | 'RAIN' | 'SNOW';

/** Everything weather changes. Physics reads `grip`; visuals read the rest. */
export interface WeatherProfile {
  readonly name: Weather;
  /** Multiplies tyre grip and braking force. 1 = dry tarmac. */
  readonly grip: number;
  readonly fogDensity: number;
  readonly fogColor: number;
  /** 0..1 particle intensity (rain streaks or snow flakes). 0 = none. */
  readonly precipitation: number;
  /** 0..1 target roughness of the road material (wet = low = mirror-like). */
  readonly roadRoughness: number;
}

/** Structural vector type; three's Vector3 satisfies it. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Disposable {
  dispose(): void;
}

/**
 * Stateful modules implement this so a race can be saved and restored exactly. `snapshot()` returns plain JSON-safe
 * data (numbers, strings, booleans, arrays, objects; Infinity encoded as null); `restore()` puts it back.
 * Restoring a snapshot and running N steps must give the same result as running those N steps without the save.
 */
export interface Serializable<T = unknown> {
  snapshot(): T;
  restore(data: T): void;
}

/** Fixed-step callback. Always receives dt = 1/60. Simulation only. */
export type FixedUpdate = (dt: number) => void;

/** Per-display-frame callback. `alpha` (0..1) is progress into the next fixed step, for interpolation. */
export type FrameCallback = (alpha: number, frameDt: number) => void;

// ───────── Input ─────────

export interface CarInput {
  /** 0..1 */
  throttle: number;
  /** 0..1 (doubles as reverse once stopped; carController decides) */
  brake: number;
  /** -1 (full right) .. +1 (full left) */
  steer: number;
  handbrake: boolean;
  nitro: boolean;
  /** Manual gearbox only (Settings > Gearbox): held-state of the shift buttons, the drivetrain acts on the press. */
  shiftUp?: boolean;
  shiftDown?: boolean;
}

export function createNeutralInput(): CarInput {
  return { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
}

/** Anything that produces CarInput: keyboard, gamepad, touch overlay. */
export interface InputSource extends Disposable {
  /** Write the current control state into `out` and return it. Must not allocate. */
  sample(out: CarInput): CarInput;
}

// ───────── Car / race state ─────────

export interface CarState {
  position: Vec3;
  /** Yaw in radians (see conventions). */
  heading: number;
  /** World-space velocity, m/s. */
  velocity: Vec3;
  /** Signed speed along the car's nose, m/s (negative = reversing). */
  speed: number;
  /** rad/s, positive = turning left. */
  yawRate: number;
  /** Signed angle between heading and velocity direction, rad (the drift angle). */
  slipAngle: number;
}

export interface RaceTelemetry {
  speedKph: number;
  rpm: number;
  redlineRpm: number;
  /** -1 reverse, 0 neutral, 1..6 forward. */
  gear: number;
  /** 0..1 nitro tank. */
  nitroLevel: number;
  nitroActive: boolean;
  drifting: boolean;
  /** Points banked in the current drift chain. */
  driftScore: number;
  lap: number;
  totalLaps: number;
  /** 1-based race position. */
  position: number;
  racerCount: number;
  /** Seconds since the green light. */
  raceTime: number;
}

// ───────── AI ─────────

export interface TrackSample {
  position: Vec3;
  /** Unit direction of travel. */
  tangent: Vec3;
  /** Drivable width at this sample, metres. */
  width: number;
}

export interface AIWorldView {
  /** Closed loop of centre-line samples, ordered in the direction of travel. */
  track: readonly TrackSample[];
  /** Every racer, player included. Index-stable for the duration of a race. */
  racers: readonly CarState[];
  /** Index of the player in `racers`. */
  playerIndex: number;
  /** Current weather grip multiplier (1 dry, 0.72 rain, 0.45 snow). Updated by the race manager every step. */
  grip: number;
}

/** Pure driving policy: reads the world, returns controls. Physics is stepped by the orchestrator. */
export interface AIRacerAgent extends Partial<Serializable> {
  readonly id: string;
  readonly name: string;
  /** 0 (rookie) .. 1 (relentless). Scales pace, braking commitment and aggression. */
  readonly skill: number;
  decide(dt: number, self: CarState, world: AIWorldView): CarInput;
}

// ───────── Cameras ─────────

export interface CameraPose {
  position: Vector3;
  lookAt: Vector3;
  fov: number;
}

/** A camera controller. All rigs drive the ONE camera owned by Engine, so switching rigs never swaps cameras. */
export interface CameraRig {
  readonly camera: PerspectiveCamera;
  /** Call once per display frame (not per fixed step) so motion stays smooth on 120 Hz screens. */
  update(frameDt: number): void;
}

// ───────── Assets ─────────

export interface CarModel {
  /** Origin on the ground at the car's centre, nose +Z, scaled to metres. */
  root: Group;
  /** Wheel nodes if the mesh exposes them. Empty for monolithic generated meshes; never depend on it. */
  wheels: readonly Object3D[];
  /** Bounding box size: x = width, y = height, z = length (metres). */
  size: Vec3;
}
