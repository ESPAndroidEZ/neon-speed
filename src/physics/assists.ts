/** Driving assists. STANDARD is the approved handling (all effects zero); BEGINNER adds help, PRO removes it. */
export type AssistLevel = 'BEGINNER' | 'STANDARD' | 'PRO';

export interface Assist {
  /** -1..1 steering assist: + shrinks lock at speed and adds yaw damping, - gives sharper, twitchier steering. */
  steer: number;
  /** -1..1 brake assist (ABS-like): + keeps the front tyres gripping under hard braking, - lets them overload. */
  brake: number;
  /** Multiplier on the automatic counter-steer in a slide. */
  counter: number;
}

export const ASSIST_LEVELS: Record<AssistLevel, Readonly<Assist>> = {
  BEGINNER: { steer: 1, brake: 1, counter: 1.7 },
  STANDARD: { steer: 0, brake: 0, counter: 1 },
  PRO: { steer: -0.7, brake: -1, counter: 0.45 },
};

export const createAssist = (level: AssistLevel = 'STANDARD'): Assist => ({ ...ASSIST_LEVELS[level] });

export function setAssist(into: Assist, level: AssistLevel): void {
  Object.assign(into, ASSIST_LEVELS[level]);
}

/** Steering sensitivity setting (0.6..1.4): scales the stick before the car sees it. */
export const clampSensitivity = (s: number): number => Math.min(1.4, Math.max(0.6, s));

/** Player driving preferences (settings screen). Read by the race manager for the player's car only; rivals always use STANDARD. */
export const DRIVING: { level: AssistLevel; sens: number; carMul: number } = { level: 'STANDARD', sens: 1, carMul: 1 };

/** Copy the preferences onto a car. Allocation free, safe to call every step. */
export function applyDriving(car: { assist: Assist; sensitivity: number }): void {
  const a = ASSIST_LEVELS[DRIVING.level];
  car.assist.steer = a.steer;
  car.assist.brake = a.brake;
  car.assist.counter = a.counter;
  car.sensitivity = clampSensitivity(DRIVING.sens * DRIVING.carMul);
}
